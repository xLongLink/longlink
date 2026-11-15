import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

test('published component provenance matches the implementation exposed to Views', async () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const entry = path.join(root, 'src/views/adapter/index.ts');
    const config = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const program = ts.createProgram([entry], parsed.options);
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(entry);
    const exports = new Map(
        checker.getExportsOfModule(checker.getSymbolAtLocation(source)).map((symbol) => [symbol.name, symbol])
    );
    const catalog = JSON.parse(
        await readFile(new URL('../../sdk/longlink/.static/jsx/components.json', import.meta.url), 'utf8')
    );
    const categories = new Set(catalog.components.map((component) => component.category.toLowerCase()));

    // Keep public bindings behind the LongLink component and hook entry points.
    for (const statement of source.statements) {
        assert.ok(ts.isExportDeclaration(statement) && statement.moduleSpecifier);
        const target = statement.moduleSpecifier.text;
        assert.match(target, /^(?:\.\/[^/]+|\.\.\/hooks)\/[^/]+$/);
        if (target.startsWith('./')) assert.ok(categories.has(target.split('/')[1]));
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
            for (const specifier of statement.exportClause.elements) {
                if (!statement.isTypeOnly && !specifier.isTypeOnly) {
                    assert.equal(target.startsWith('../hooks/'), /^use[A-Z]/.test(specifier.name.text));
                }
            }
        }
    }

    // Declaration generation must use the same adapters, including its curated SDK subset.
    const frontend = ts.createSourceFile(
        'frontend.ts',
        await readFile(path.join(root, 'scripts/frontend.ts'), 'utf8'),
        ts.ScriptTarget.Latest,
        true
    );
    for (const statement of frontend.statements.filter(ts.isExportDeclaration)) {
        assert.match(statement.moduleSpecifier?.text ?? '', /^\.\.\/src\/views\/(?:adapter\/[^/]+|hooks)\/[^/]+$/);
    }

    // Resolve actual TypeScript aliases so a custom wrapper cannot masquerade as a native component.
    for (const component of catalog.components.filter((component) => component.category !== 'Runtime')) {
        const symbol = exports.get(component.name);
        assert.ok(symbol, `${component.name} is documented but not exposed to Views.`);
        const declaration = symbol.declarations?.find(ts.isExportSpecifier);
        assert.ok(declaration, `${component.name} must have an explicit public entry point.`);
        const target = declaration.parent.parent.moduleSpecifier.text;
        assert.equal(
            target.startsWith('../hooks/') ? 'hooks' : target.split('/')[1],
            /^use[A-Z]/.test(component.name) ? 'hooks' : component.category.toLowerCase(),
            `${component.name} must follow its documentation category.`
        );
        let implementation = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
        const adapter = implementation.declarations?.[0];
        if (adapter && ts.isVariableDeclaration(adapter) && adapter.getSourceFile().fileName.includes('/views/adapter/')) {
            let initializer = adapter.initializer;
            if (initializer && ts.isCallExpression(initializer)) {
                const factory = checker.getSymbolAtLocation(initializer.expression);
                const resolved = factory.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(factory) : factory;
                assert.equal(resolved.name, 'viewComponent');
                assert.ok(resolved.declarations?.[0]?.getSourceFile().fileName.endsWith('/views/adapter/props.ts'));
                assert.equal(initializer.arguments.length, 1);
                [initializer] = initializer.arguments;
            }
            assert.ok(initializer && ts.isPropertyAccessExpression(initializer), `${component.name} must retain its implementation.`);
            const original = checker.getSymbolAtLocation(initializer);
            assert.ok(original);
            implementation = original.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(original) : original;
        }
        const filename = implementation.declarations?.[0]?.getSourceFile().fileName;
        assert.ok(
                component.source === 'recharts' || component.source === 'react-hook-form'
                    ? filename?.includes(`/node_modules/${component.source}/`)
                : component.source === 'custom'
                  ? filename?.includes('/components/custom/') || filename?.includes('/components/longlink/') || filename?.includes('/components/dialogs/')
                : filename?.includes(`/components/${component.source}/`),
            `${component.name} is documented as ${component.source}, but resolves to ${filename}.`
        );
    }
});

test('SDK declarations support native JSX composition without installed React or Base UI types', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'longlink-frontend-'));
    try {
        const declarations = await readFile(
            new URL('../../sdk/longlink/.static/jsx/frontend.d.ts', import.meta.url),
            'utf8'
        );
        const fixture = await readFile(new URL('./frontend.contract.jsx', import.meta.url), 'utf8');
        const declarationPath = path.join(directory, 'frontend.d.ts');
        const fixturePath = path.join(directory, 'view.jsx');
        await writeFile(declarationPath, declarations);
        await writeFile(fixturePath, fixture);
        const program = ts.createProgram([declarationPath, fixturePath], {
            strict: true,
            allowJs: true,
            checkJs: true,
            noEmit: true,
            skipLibCheck: false,
            types: [],
            jsx: ts.JsxEmit.Preserve,
            target: ts.ScriptTarget.ES2022,
            lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
        });
        // Existing global Text and Image APIs collide with lib.dom constructors, independently of native props.
        const diagnostics = ts
            .getPreEmitDiagnostics(program)
            .filter(
                (diagnostic) =>
                    !(
                        diagnostic.code === 2300 &&
                        /^Duplicate identifier '(Text|Image)'\.$/.test(String(diagnostic.messageText))
                    )
            );
        assert.equal(
            diagnostics.length,
            0,
            ts.formatDiagnosticsWithColorAndContext(diagnostics, {
                getCanonicalFileName: (name) => name,
                getCurrentDirectory: () => directory,
                getNewLine: () => '\n',
            })
        );
        assert.ok(
            program
                .getSourceFiles()
                .every(
                    (source) =>
                        source.fileName === declarationPath || source.fileName === fixturePath || source.hasNoDefaultLib
                )
        );
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

import path from 'node:path';
import ts from 'typescript';
import * as prettier from 'prettier';
import * as astryx from '@astryxdesign/cli/api';
import { readFile, writeFile } from 'node:fs/promises';
import { documentationCategories } from '../src/lib/documentation.ts';

const root = path.resolve(import.meta.dirname, '..');
const input = path.resolve(root, '../sdk/longlink/.static/jsx/frontend.d.ts');
let source = await readFile(input, 'utf8');

// Derive editor component signatures from explicit LongLink wrappers, not upstream props.
const bindings = ts.createSourceFile(
    'components.ts',
    await readFile(path.join(root, 'src/views/components.ts'), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
);
const editor = ts.createSourceFile(input, source, ts.ScriptTarget.Latest, true);
const replacements = [];
const introductions = new Map();
for (const binding of bindings.statements) {
    if (!ts.isExportDeclaration(binding) || !binding.moduleSpecifier || !ts.isNamedExports(binding.exportClause))
        continue;
    const modulePath = binding.moduleSpecifier.text;
    if (!modulePath.startsWith('@/components/ui/') || ['Card', 'Icon', 'Calendar'].includes(path.basename(modulePath)))
        continue;
    const filename = path.join(root, 'src', modulePath.slice(2) + '.tsx');
    const wrapper = ts.createSourceFile(
        filename,
        await readFile(filename, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
    const aliases = new Map(
        wrapper.statements.filter(ts.isTypeAliasDeclaration).map((alias) => [alias.name.text, alias.type]),
    );
    for (const exported of binding.exportClause.elements) {
        const name = exported.name.text;
        const implementation = wrapper.statements.find(
            (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name,
        );
        if (!implementation) continue;
        const description = implementation.jsDoc
            ?.map((comment) => comment.comment)
            .filter((comment) => typeof comment === 'string')
            .join(' ');
        if (description) introductions.set(name, description);
        const parameter = implementation.parameters[0];
        let props = parameter?.type;
        if (props && ts.isTypeReferenceNode(props) && aliases.has(props.typeName.getText(wrapper)))
            props = aliases.get(props.typeName.getText(wrapper));
        const propText = (props?.getText(wrapper) ?? '{}')
            .replaceAll('ReactNode', 'ViewNode')
            .replaceAll('StoneIconName', 'string')
            .replace(/MouseEvent<HTMLButtonElement>/g, 'ViewMouseEvent');
        const generics = implementation.typeParameters?.length
            ? `<${implementation.typeParameters.map((type) => type.getText(wrapper)).join(', ')}>`
            : '';
        const statement = editor.statements.find((statement) =>
            ts.isFunctionDeclaration(statement)
                ? statement.name?.text === name
                : ts.isVariableStatement(statement) &&
                  statement.declarationList.declarations[0].name.getText(editor) === name,
        );
        const publicType = name === 'Button' || name === 'DateInput' ? `${name}Props` : propText;
        if (statement)
            replacements.push({
                start: statement.getStart(editor),
                end: statement.end,
                text: `declare function ${name}${generics}(props: ${publicType}): React.JSX.Element;`,
            });
        if (name === 'Button' || name === 'DateInput') {
            const alias = editor.statements.find(
                (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === `${name}Props`,
            );
            if (alias) replacements.push({ start: alias.type.getStart(editor), end: alias.type.end, text: propText });
        }
    }
}

// Keep the common field contract synchronized with the wrappers that consume it.
const fields = ts.createSourceFile(
    'types.ts',
    await readFile(path.join(root, 'src/components/ui/types.ts'), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
);
const fieldType = fields.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'FieldProps',
);
const editorField = editor.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'FieldProps',
);
replacements.push({
    start: editorField.type.getStart(editor),
    end: editorField.type.end,
    text: fieldType.type.getText(fields),
});
for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    source = source.slice(0, replacement.start) + replacement.text + source.slice(replacement.end);
}
source = await prettier.format(source, { parser: 'typescript', tabWidth: 4, printWidth: 120, singleQuote: true });
const document = ts.createSourceFile(input, source, ts.ScriptTarget.Latest, true);

// Read effective public props from the editor declarations, including shared field intersections.
const compilerHost = ts.createCompilerHost({});
const getSourceFile = compilerHost.getSourceFile;
compilerHost.getSourceFile = (filename, ...args) =>
    path.resolve(filename) === input ? document : getSourceFile(filename, ...args);
const program = ts.createProgram([input], { skipLibCheck: true, strictNullChecks: true }, compilerHost);
const checker = program.getTypeChecker();
const publicProps = new Map();
for (const statement of document.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name || !statement.parameters[0]) continue;
    publicProps.set(
        statement.name.text,
        checker
            .getTypeAtLocation(statement.parameters[0])
            .getProperties()
            .map((property) => ({
                name: property.name,
                type: checker.typeToString(
                    checker.getTypeOfSymbolAtLocation(property, statement.parameters[0]),
                    undefined,
                    ts.TypeFormatFlags.NoTruncation,
                ),
                required: !(property.flags & ts.SymbolFlags.Optional),
            })),
    );
}

// Use TypeScript's parser rather than maintaining another markup or declaration parser.
if (document.parseDiagnostics.length) {
    throw new Error(ts.flattenDiagnosticMessageText(document.parseDiagnostics[0].messageText, '\n'));
}
const declarations = document.statements.flatMap((statement) => {
    const declaration = ts.isVariableStatement(statement) ? statement.declarationList.declarations[0] : statement;

    // Publish runtime bindings and their documented prop types, not editor-only namespaces.
    if (
        !ts.isVariableDeclaration(declaration) &&
        !ts.isFunctionDeclaration(declaration) &&
        !ts.isTypeAliasDeclaration(declaration)
    )
        return [];
    const name = declaration.name?.getText(document);
    if (!name) return [];

    // Keep guide-only bindings available to editors without publishing standalone catalog entries.
    const tags = ts.getJSDocTags(statement);
    if (tags.some((tag) => tag.tagName.text === 'ignore')) return [];

    // Include shared prop types only when explicitly assigned to a documentation entry.
    if (ts.isTypeAliasDeclaration(declaration) && !tags.some((tag) => tag.tagName.text === 'category')) return [];

    // Read category identity from the editor declaration and retain the published category order.
    const category = tags.find((tag) => tag.tagName.text === 'category')?.comment;
    if (!category) throw new Error(`Missing documentation category: ${name}`);
    if (typeof category !== 'string' || !documentationCategories.includes(category))
        throw new Error(`Unknown documentation category: ${name}: ${category}`);

    // Let related runtime declarations publish one shared documentation entry.
    const group = tags.find((tag) => tag.tagName.text === 'group')?.comment;
    if (group !== undefined && (typeof group !== 'string' || !group.trim()))
        throw new Error(`Invalid documentation group: ${name}`);
    return [
        {
            name: group?.trim() ?? name,
            category,
            declaration: statement.getText(document),
        },
    ];
});

// Preserve declaration order within a group, and expose only the shared catalog contract.
const groups = new Map();
for (const entry of declarations) {
    const existing = groups.get(entry.name);
    if (existing) {
        if (existing.category !== entry.category)
            throw new Error(`Conflicting documentation categories: ${entry.name}`);
        existing.declaration += `\n\n${entry.declaration}`;
    } else {
        groups.set(entry.name, entry);
    }
}
const components = [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));

// Read the same authored component content used by the Astryx website, pinned to the installed library.
const references = [];
for (const entry of components) {
    if (entry.category === 'Runtime' || ['Card', 'Currency', 'FileViewer', 'Menu', 'Tabs'].includes(entry.name))
        continue;
    const result = await astryx.component(entry.name);
    const detail = result.data;
    const parentName = detail.subComponentOf ?? detail.parentDoc;
    const parent = parentName ? (await astryx.component(parentName)).data : detail;
    const usage = detail.usage ?? parent.usage;
    const supportedProps = publicProps.get(entry.name);
    const upstreamProps =
        detail.props ?? detail.components?.find((component) => component.name === entry.name)?.props ?? [];

    references.push({
        name: entry.name,
        url: `https://astryx.atmeta.com/components/${parentName ?? entry.name}`,
        introduction:
            introductions.get(entry.name) ??
            detail.usage?.description ??
            detail.description ??
            usage?.description ??
            '',
        anatomy: usage?.anatomy ?? [],
        properties: (supportedProps ?? upstreamProps)
            // View components use their preset styling rather than caller-provided classes.
            .filter((property) => property.name !== 'className')
            .map(({ name, type, required, default: defaultValue, description }) => ({
                name,
                type,
                required,
                default: defaultValue,
                description:
                    description ??
                    upstreamProps.find((property) => property.name === name)?.description ??
                    `The ${name} prop.`,
            })),
        practices: (usage?.bestPractices ?? []).filter(
            (practice) =>
                !supportedProps ||
                !upstreamProps.some(
                    (property) =>
                        !supportedProps.some((supported) => supported.name === property.name) &&
                        practice.description.includes(property.name),
                ),
        ),
    });
}

// Keep website-only reference content out of the SDK's declaration catalog.
const outputs = [
    { filename: input, text: source },
    { filename: path.resolve(root, 'src/lib/generated/components.json'), data: references },
    { filename: path.resolve(root, '../sdk/longlink/.static/jsx/components.json'), data: components },
];

// CLI and website documentation share one generated catalog; checking must not modify files.
for (const { filename, data, text } of outputs) {
    const output = text ?? `${JSON.stringify(data, null, 4)}\n`;
    const current = await readFile(filename, 'utf8').catch((error) => {
        // Only a missing output is regenerable; surface permission and other I/O failures.
        if (error.code === 'ENOENT') return undefined;
        throw error;
    });
    if (current !== output) {
        if (process.argv.includes('--check')) {
            console.error(`Generated documentation is stale: ${filename}`);
            process.exitCode = 1;
        } else {
            await writeFile(filename, output, 'utf8');
        }
    }
}

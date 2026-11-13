import assert from 'node:assert/strict';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

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

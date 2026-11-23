import ts from 'typescript';
import { it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';

it('checks packaged bare JSX props, native constructors, and schema types', () => {
    // Arrange
    const configPath = fileURLToPath(new URL('./fixtures/tsconfig.json', import.meta.url));

    // Act
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        fileURLToPath(new URL('./fixtures', import.meta.url))
    );
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

        if (!diagnostic.file || diagnostic.start === undefined) return message;
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

        return `${diagnostic.file.fileName}:${line + 1}:${character + 1}: ${message}`;
    });

    // Assert
    expect(diagnostics).toEqual([]);
}, 30_000);

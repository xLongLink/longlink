import path from 'node:path';
import ts from 'typescript';
import { readFile, writeFile } from 'node:fs/promises';
import { documentationCategories } from '../src/lib/documentation.ts';

const root = path.resolve(import.meta.dirname, '..');
const input = path.resolve(root, '../sdk/longlink/.static/jsx/frontend.d.ts');
const source = await readFile(input, 'utf8');
const document = ts.createSourceFile(input, source, ts.ScriptTarget.Latest, true);

// Use TypeScript's parser rather than maintaining another markup or declaration parser.
if (document.parseDiagnostics.length) {
    throw new Error(ts.flattenDiagnosticMessageText(document.parseDiagnostics[0].messageText, '\n'));
}
const declarations = document.statements
    .flatMap((statement) => {
        const declaration = ts.isVariableStatement(statement) ? statement.declarationList.declarations[0] : statement;

        // Publish runtime bindings, not namespaces that exist only for editor types.
        if (!ts.isVariableDeclaration(declaration) && !ts.isFunctionDeclaration(declaration)) return [];
        const name = declaration.name?.getText(document);
        if (!name) return [];

        // Keep guide-only bindings available to editors without publishing standalone catalog entries.
        const tags = ts.getJSDocTags(statement);
        if (tags.some((tag) => tag.tagName.text === 'ignore')) return [];

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
        if (existing.category !== entry.category) throw new Error(`Conflicting documentation categories: ${entry.name}`);
        existing.declaration += `\n\n${entry.declaration}`;
    } else {
        groups.set(entry.name, entry);
    }
}
const components = [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));

const filename = path.resolve(root, '../sdk/longlink/.static/jsx/components.json');
const output = `${JSON.stringify(components, null, 4)}\n`;

// CLI and website documentation share one generated catalog; checking must not modify files.
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

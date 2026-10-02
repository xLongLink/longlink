import path from 'node:path';
import ts from 'typescript';
import * as astryx from '@astryxdesign/cli/api';
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

        // Publish runtime bindings and their documented prop types, not editor-only namespaces.
        if (!ts.isVariableDeclaration(declaration) && !ts.isFunctionDeclaration(declaration) && !ts.isTypeAliasDeclaration(declaration)) return [];
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
        if (existing.category !== entry.category) throw new Error(`Conflicting documentation categories: ${entry.name}`);
        existing.declaration += `\n\n${entry.declaration}`;
    } else {
        groups.set(entry.name, entry);
    }
}
const components = [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));

// Read the same authored component content used by the Astryx website, pinned to the installed library.
const references = [];
for (const entry of components) {
    if (entry.category === 'Runtime' || ['Currency', 'FileViewer', 'Menu'].includes(entry.name)) continue;
    const result = await astryx.component(entry.name);
    const detail = result.data;
    const parentName = detail.subComponentOf ?? detail.parentDoc;
    const parent = parentName ? (await astryx.component(parentName)).data : detail;
    const usage = detail.usage ?? parent.usage;
    const blocks = await astryx.component(parentName ?? entry.name, { blocks: true });
    const examples = [];

    // Publish one representative upstream example per component, preferring its showcase.
    const block = blocks.data.showcase ?? blocks.data.examples[0];
    if (block) {
        const example = await astryx.template(block.name);

        // Omit upstream file headers from the displayed example snippet.
        let code = example.data.source
            .replace(/^\/\/ Copyright \(c\) Meta Platforms, Inc\. and affiliates\.\r?\n/, '')
            .replace(/^\s*(['"])use client\1;\s*/, '')
            .trimStart();

        // Show standalone functions without package imports or export modifiers.
        const snippet = ts.createSourceFile('example.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const omissions = snippet.statements.flatMap((statement) => {
            if (ts.isImportDeclaration(statement)) return [{ start: statement.getStart(snippet), end: statement.end }];
            if (!ts.isFunctionDeclaration(statement)) return [];
            return (statement.modifiers ?? [])
                .filter((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword)
                .map((modifier) => ({ start: modifier.getStart(snippet), end: modifier.end }));
        });
        for (const omission of omissions.reverse()) {
            code = code.slice(0, omission.start) + code.slice(omission.end).trimStart();
        }
        code = code.trimStart();
        examples.push({ title: block.displayName, description: block.description, code });
    }
    references.push({
        name: entry.name,
        url: `https://astryx.atmeta.com/components/${parentName ?? entry.name}`,
        introduction: detail.usage?.description ?? detail.description ?? usage?.description ?? '',
        anatomy: usage?.anatomy ?? [],
        properties: (detail.props ?? detail.components?.find((component) => component.name === entry.name)?.props ?? []).map(
            ({ name, type, required, default: defaultValue, description }) => ({
                name,
                type,
                required,
                default: defaultValue,
                description,
            })
        ),
        practices: usage?.bestPractices ?? [],
        examples,
    });
}

// Keep website-only reference content out of the SDK's declaration catalog.
const outputs = [
    { filename: path.resolve(root, 'src/lib/generated/components.json'), data: references },
    { filename: path.resolve(root, '../sdk/longlink/.static/jsx/components.json'), data: components },
];

// CLI and website documentation share one generated catalog; checking must not modify files.
for (const { filename, data } of outputs) {
    const output = `${JSON.stringify(data, null, 4)}\n`;
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

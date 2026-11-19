import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateDtsBundle } from 'dts-bundle-generator';
import ts from 'typescript';
import iconImports from 'lucide-react/dynamicIconImports.mjs';

const root = path.dirname(import.meta.dirname);
const entry = path.join(import.meta.dirname, 'frontend.ts');
const configPath = path.join(root, 'tsconfig.app.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram([entry], options);
const checker = program.getTypeChecker();
const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(entry)));
const libraries = new Set();
for (const file of program.getSourceFiles()) {
    const name = file.fileName.split('/node_modules/').at(-1);
    if (name === file.fileName) continue;
    const pkg = name.split('/').slice(0, name.startsWith('@') ? 2 : 1).join('/');
    if (pkg !== 'lucide-react') libraries.add(pkg);
}

const [bundle] = generateDtsBundle([{
    filePath: entry,
    libraries: { inlinedLibraries: [...libraries], allowedTypesLibraries: [] },
    output: { noBanner: true, umdModuleName: 'NativeFrontend', exportReferencedTypes: false },
}], { preferredConfigPath: configPath });

// React ships empty fallback DOM interfaces for non-browser projects. Use lib.dom in Views.
const dom = new Set(program.getSourceFiles()
    .filter((file) => file.hasNoDefaultLib && file.fileName.endsWith('/lib.dom.d.ts'))
    .flatMap((file) => file.statements.filter(ts.isInterfaceDeclaration).map((node) => node.name.text)));
const reactDom = program.getSourceFiles().find((file) => file.fileName.endsWith('/@types/react/global.d.ts'));
const fallbacks = new Set(reactDom.statements.filter(ts.isInterfaceDeclaration).map((node) => node.name.text));
const source = ts.createSourceFile('frontend.native.d.ts', bundle, ts.ScriptTarget.Latest, true);
const statements = source.statements.filter((node) => {
    if (ts.isImportDeclaration(node)) {
        if (node.moduleSpecifier.text === 'lucide-react/dynamic' && node.importClause?.namedBindings?.getText() === '{ IconName }') return false;
        throw new Error(`Unbundled SDK dependency: ${node.getText()}`);
    }
    return !(ts.isInterfaceDeclaration(node) && !node.members.length && dom.has(node.name.text) && fallbacks.has(node.name.text));
});
const native = statements.map((node) => node.getFullText(source)).join('').replace(/[ \t]+$/gm, '').trim() + '\n';
const globals = await readFile(new URL('frontend.globals.d.ts', import.meta.url), 'utf8');
const aliases = exports.map(({ name }) => name)
    .filter((name) => !['Image', 'Text', 'Map', 'FrontendElement'].includes(name))
    .sort().map((name) => `import ${name} = NativeFrontend.${name};`).join('\n');
const icons = Object.keys(iconImports).map((name) => JSON.stringify(name)).join(' | ');
for (const [name, content] of [
    ['frontend.native.d.ts', native],
    ['frontend.d.ts', `/// <reference path="./frontend.native.d.ts" />\n${globals.trimEnd()}\n\ntype IconName = ${icons};\n\n${aliases}\n`],
]) {
    const target = new URL(`../../sdk/longlink/.static/jsx/${name}`, import.meta.url);
    if (process.argv.includes('--check')) {
        if (await readFile(target, 'utf8') !== content) throw new Error(`${name} is stale. Run bun run generate:frontend.`);
    } else {
        await writeFile(target, content);
    }
}

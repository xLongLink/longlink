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
const propertyDefaults = new Map();

// Generate the finite public icon contract from the same Lucide registry used by the runtime.
const icons = ts.createSourceFile(
    'Icon.tsx',
    await readFile(path.join(root, 'src/components/ui/Icon.tsx'), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
);
const registry = icons.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((declaration) => declaration.name.getText(icons) === 'stoneIconComponents');
const iconObject =
    registry?.initializer && ts.isSatisfiesExpression(registry.initializer)
        ? registry.initializer.expression
        : registry?.initializer;
if (!iconObject || !ts.isObjectLiteralExpression(iconObject)) throw new Error('Missing LongLink icon registry');
const editorIcons = editor.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'StoneIconName',
);
if (!editorIcons) throw new Error('Missing editor icon type');
replacements.push({
    start: editorIcons.type.getStart(editor),
    end: editorIcons.type.end,
    text: iconObject.properties.map((property) => JSON.stringify(property.name.getText(icons))).join(' | '),
});

for (const binding of bindings.statements) {
    if (!ts.isExportDeclaration(binding) || !binding.moduleSpecifier || !ts.isNamedExports(binding.exportClause))
        continue;
    const modulePath = binding.moduleSpecifier.text;
    if (!modulePath.startsWith('@/components/ui/')) continue;
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

        // Read defaults from the wrapper rather than maintaining a separate documentation configuration.
        const defaults = new Map();
        if (parameter && ts.isObjectBindingPattern(parameter.name)) {
            for (const element of parameter.name.elements) {
                if (element.initializer)
                    defaults.set(
                        (element.propertyName ?? element.name).getText(wrapper),
                        element.initializer.getText(wrapper),
                    );
            }
        }

        /** Collects explicit prop fallbacks from the wrapper's rendered components. */
        function readDefaults(node) {
            // Sized controls retain inherited sizes before using their explicit fallback.
            if (
                ts.isVariableDeclaration(node) &&
                node.initializer &&
                ts.isCallExpression(node.initializer) &&
                node.initializer.expression.getText(wrapper) === 'useSize'
            ) {
                defaults.set('size', node.initializer.arguments[1].getText(wrapper));
            }

            // Only nullish fallbacks define a default without replacing caller-provided values.
            if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer)) {
                const expression = node.initializer.expression;
                if (
                    expression &&
                    ts.isBinaryExpression(expression) &&
                    expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
                )
                    defaults.set(node.name.getText(wrapper), expression.right.getText(wrapper));
            }
            ts.forEachChild(node, readDefaults);
        }
        readDefaults(implementation);
        propertyDefaults.set(name, defaults);

        let props = parameter?.type;
        if (props && ts.isTypeReferenceNode(props) && aliases.has(props.typeName.getText(wrapper)))
            props = aliases.get(props.typeName.getText(wrapper));
        const propText = (props?.getText(wrapper) ?? '{}')
            .replaceAll('ReactNode', 'ViewNode')
            .replace(/MouseEvent<(HTMLButtonElement|HTMLElement)>/g, 'ViewMouseEvent');
        const generics = implementation.typeParameters?.length
            ? `<${implementation.typeParameters.map((type) => type.getText(wrapper)).join(', ')}>`
            : '';
        const statement = editor.statements.find((statement) =>
            ts.isFunctionDeclaration(statement)
                ? statement.name?.text === name
                : ts.isVariableStatement(statement) &&
                  statement.declarationList.declarations[0].name.getText(editor) === name,
        );
        const publicType = ['Button', 'Card', 'DateInput'].includes(name) ? `${name}Props` : propText;
        if (statement)
            replacements.push({
                start: statement.getStart(editor),
                end: statement.end,
                text: `declare function ${name}${generics}(props: ${publicType}): React.JSX.Element;`,
            });
        if (['Button', 'Card', 'DateInput'].includes(name)) {
            const alias = editor.statements.find(
                (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === `${name}Props`,
            );
            if (alias)
                replacements.push({
                    start: alias.type.getStart(editor),
                    end: alias.type.end,
                    text: propText,
                });
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
source = await prettier.format(source, {
    parser: 'typescript',
    tabWidth: 4,
    printWidth: 120,
    singleQuote: true,
});
const document = ts.createSourceFile(input, source, ts.ScriptTarget.Latest, true);

// Read effective public props from the editor declarations, including shared field intersections.
const compilerHost = ts.createCompilerHost({});
const getSourceFile = compilerHost.getSourceFile;
compilerHost.getSourceFile = (filename, ...args) =>
    path.resolve(filename) === input ? document : getSourceFile(filename, ...args);
const program = ts.createProgram([input], { skipLibCheck: true, strictNullChecks: true }, compilerHost);
const checker = program.getTypeChecker();
const publicProps = new Map();
const spacing = document.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Spacing',
);
const iconType = document.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'StoneIconName',
);

/** Hides omission from prop choices while preserving empty values in callback contracts. */
function documentedType(type) {
    // Work with TypeScript syntax so nullable values and nested callable types remain correct.
    const node = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation);
    const result = ts.transform(node, [
        (context) => {
            /** Uses familiar React types and explicit spacing choices without hiding callback empty values. */
            function visit(node, preserveUndefined = false) {
                // Render wrapper React content and the supported spacing scale instead of editor-only aliases.
                if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
                    if (node.typeName.text === 'ViewNode') return ts.factory.createTypeReferenceNode('ReactNode');
                    if (node.typeName.text === 'Spacing') return spacing.type;
                    if (node.typeName.text === 'StoneIconName') return iconType.type;
                }

                // Omission is not a prop choice, but callbacks can genuinely emit an empty value.
                if (ts.isUnionTypeNode(node) && !preserveUndefined) {
                    const options = node.types.filter((option) => option.kind !== ts.SyntaxKind.UndefinedKeyword);
                    if (options.length === 1) return ts.visitNode(options[0], visit);
                    return ts.factory.updateUnionTypeNode(
                        node,
                        options.map((option) => ts.visitNode(option, visit)),
                    );
                }
                return ts.visitEachChild(
                    node,
                    (child) =>
                        visit(
                            child,
                            preserveUndefined || ts.isFunctionTypeNode(node) || ts.isConstructorTypeNode(node),
                        ),
                    context,
                );
            }
            return (node) => ts.visitNode(node, visit);
        },
    ]);
    const transformed = result.transformed[0];
    const text = ts
        .createPrinter()
        .printNode(
            ts.EmitHint.Unspecified,
            ts.isParenthesizedTypeNode(transformed) ? transformed.type : transformed,
            document,
        );
    result.dispose();
    return text.replace(/\s*\n\s*/g, ' ');
}

for (const statement of document.statements) {
    const declaration = ts.isVariableStatement(statement) ? statement.declarationList.declarations[0] : statement;
    if (!ts.isFunctionDeclaration(declaration) && !ts.isVariableDeclaration(declaration)) continue;
    if (ts.isFunctionDeclaration(declaration) && declaration.parameters[0]?.name.getText(document) !== 'props')
        continue;
    const signature = checker.getTypeAtLocation(declaration).getCallSignatures()[0];
    const parameter = signature?.getParameters()[0];
    if (!parameter) continue;
    const props = checker.getTypeOfSymbolAtLocation(parameter, declaration);
    const variants = props.isUnion() ? props.types : [props];
    const properties = new Map();

    // Include variant-specific props as well as inherited fields and callable component props.
    for (const variant of variants) {
        for (const property of variant.getProperties()) {
            const type = documentedType(checker.getTypeOfSymbolAtLocation(property, declaration));
            const existing = properties.get(property.name);
            if (existing) {
                existing.types.add(type);
                existing.required &&= !(property.flags & ts.SymbolFlags.Optional);
                existing.variants += 1;
            } else {
                properties.set(property.name, {
                    types: new Set([type]),
                    required: !(property.flags & ts.SymbolFlags.Optional),
                    variants: 1,
                    description: ts.displayPartsToString(property.getDocumentationComment(checker)),
                });
            }
        }
    }
    publicProps.set(
        declaration.name.getText(document),
        [...properties].map(([name, property]) => ({
            name,
            type: [...property.types].map((type) => (property.types.size > 1 ? `(${type})` : type)).join(' | '),
            required: property.required && property.variants === variants.length,
            default: propertyDefaults.get(declaration.name.getText(document))?.get(name),
            description: property.description || undefined,
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
            ...(category !== 'Runtime' && publicProps.has(name)
                ? {
                      properties: publicProps.get(name).map((property) => ({
                          ...property,
                          name: group && group.trim() !== name ? `${name}.${property.name}` : property.name,
                      })),
                  }
                : {}),
            ...(category === 'Runtime' && ts.isFunctionDeclaration(declaration)
                ? {
                      members: [
                          {
                              name: `${name}(${declaration.parameters.map((parameter) => parameter.name.getText(document)).join(', ')})`,
                              description:
                                  statement.jsDoc
                                      ?.map((comment) => comment.comment)
                                      .filter((comment) => typeof comment === 'string')
                                      .join(' ') ?? '',
                          },
                      ],
                  }
                : {}),
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
        if (entry.members) (existing.members ??= []).push(...entry.members);
        if (entry.properties) (existing.properties ??= []).push(...entry.properties);
    } else {
        groups.set(entry.name, entry);
    }
}
const components = [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));

// Read the same authored component content used by the Astryx website, pinned to the installed library.
const references = [];
const componentDetails = new Map();

/** Reuses successful documentation lookups for the lifetime of this generation. */
async function componentDetail(name) {
    // Load each component or shared parent only once, preserving lookup failures.
    if (!componentDetails.has(name)) {
        const result = await astryx.component(name);
        componentDetails.set(name, result.data);
    }
    return componentDetails.get(name);
}

for (const entry of components) {
    if (entry.category === 'Runtime' || ['Card', 'Currency', 'FileViewer', 'Form', 'Menu', 'Tabs'].includes(entry.name))
        continue;
    const detail = await componentDetail(entry.name);
    const parentName = detail.subComponentOf ?? detail.parentDoc;
    const parent = parentName ? await componentDetail(parentName) : detail;
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
        properties: (supportedProps ?? upstreamProps)
            // View components use their preset styling rather than caller-provided classes.
            .filter((property) => property.name !== 'className')
            .map(({ name, type, required, default: defaultValue, description }) => ({
                name,
                type,
                required,
                default:
                    defaultValue ??
                    (required ? undefined : upstreamProps.find((property) => property.name === name)?.default),
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

// Share authored prop descriptions with the CLI without copying website-only guide content.
for (const entry of components) {
    const reference = references.find((reference) => reference.name === entry.name);
    for (const property of entry.properties ?? []) {
        const referenceProperty = reference?.properties.find((candidate) => candidate.name === property.name);
        property.description ??= referenceProperty?.description;
        property.default ??= referenceProperty?.default;
        if (property.default !== undefined && property.default !== '-')
            property.description = `${property.description ?? `The ${property.name} prop.`} Default: ${property.default}.`;
    }
}

// Publish property contracts only in the SDK catalog and website-only guidance separately.
const outputs = [
    { filename: input, text: source },
    {
        filename: path.resolve(root, 'src/lib/generated/components.json'),
        data: references.map(({ properties, ...reference }) => reference),
    },
    {
        filename: path.resolve(root, '../sdk/longlink/.static/jsx/components.json'),
        data: components,
    },
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

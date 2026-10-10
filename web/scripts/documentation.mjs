import path from 'node:path';
import ts from 'typescript';
import * as yaml from 'yaml';
import * as prettier from 'prettier';
import * as astryx from '@astryxdesign/cli/api';
import { readFile, writeFile } from 'node:fs/promises';
import { documentationCategories } from '../src/lib/documentation.ts';

const root = path.resolve(import.meta.dirname, '..');
const input = path.resolve(root, '../sdk/longlink/.static/jsx/frontend.d.ts');
let source = await readFile(input, 'utf8');

// Resolve exported signatures, including re-exported helpers, from the runtime's TypeScript program.
const runtimeConfig = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile);
if (runtimeConfig.error) throw new Error(ts.flattenDiagnosticMessageText(runtimeConfig.error.messageText, '\n'));
const runtimeOptions = ts.parseJsonConfigFileContent(runtimeConfig.config, ts.sys, root).options;
const runtimeProgram = ts.createProgram([path.join(root, 'src/views/components.ts')], runtimeOptions);
const bindings = runtimeProgram.getSourceFile(path.join(root, 'src/views/components.ts'));
if (!bindings) throw new Error('Missing runtime component bindings: src/views/components.ts');

const editor = ts.createSourceFile(input, source, ts.ScriptTarget.Latest, true);
const replacements = [];
const introductions = new Map();
const propertyDefaults = new Map();
const componentMetadata = new Map();
const componentDeclarations = [];
const runtimeChecker = runtimeProgram.getTypeChecker();

/** Translates runtime support types to the standalone editor's existing aliases. */
function editorType(text) {
    return text
        .replaceAll('ReactNode', 'ViewNode')
        .replace(/MouseEvent<(HTMLButtonElement|HTMLElement)>/g, 'ViewMouseEvent')
        .replaceAll('ProportionalWidth', "Extract<ColumnWidth, { type: 'proportional' }>")
        .replaceAll('PixelWidth', "Extract<ColumnWidth, { type: 'pixel' }>");
}

// Generate editor suggestions from the complete public icon type, including Lucide's on-demand catalog.
const icons = runtimeProgram.getSourceFile(path.join(root, 'src/components/ui/Icon.tsx'));
if (!icons) throw new Error('Missing runtime icon source: src/components/ui/Icon.tsx');

const iconAlias = icons.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'StoneIconName',
);
if (!iconAlias) throw new Error('Missing LongLink icon type');
const iconNames = runtimeProgram.getTypeChecker().getTypeFromTypeNode(iconAlias.type);
if (!iconNames.isUnion() || !iconNames.types.every((type) => type.isStringLiteral()))
    throw new Error('LongLink icon names must be a finite string union');
const editorIcons = editor.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'StoneIconName',
);
if (!editorIcons) throw new Error('Missing editor icon type');
replacements.push({
    start: editorIcons.type.getStart(editor),
    end: editorIcons.type.end,
    text: iconNames.types.map((type) => JSON.stringify(type.value)).join(' | '),
});

for (const binding of bindings.statements) {
    if (!ts.isExportDeclaration(binding)) continue;
    if (binding.isTypeOnly) continue;
    if (!binding.moduleSpecifier || !binding.exportClause || !ts.isNamedExports(binding.exportClause))
        throw new Error('Public runtime bindings must use named exports');

    // Keep category and group identity beside the runtime exports, including grouped children and helpers.
    const tags = ts.getJSDocTags(binding);
    const category = tags.find((tag) => tag.tagName.text === 'category')?.comment;
    if (typeof category !== 'string' || !documentationCategories.includes(category))
        throw new Error(`Unknown documentation category: ${binding.getText(bindings)}`);
    const group = tags.find((tag) => tag.tagName.text === 'group')?.comment;
    if (group !== undefined && (typeof group !== 'string' || !group.trim()))
        throw new Error(`Invalid documentation group: ${binding.getText(bindings)}`);
    const overview = binding.jsDoc
        ?.map((comment) => comment.comment)
        .filter((comment) => typeof comment === 'string')
        .join(' ');

    for (const exported of binding.exportClause.elements) {
        if (exported.isTypeOnly) continue;
        const name = exported.name.text;

        // Resolve re-exported implementations too; an unsupported binding must fail rather than disappear.
        const symbol = runtimeChecker.getSymbolAtLocation(exported.name);
        if (!symbol) throw new Error(`Missing runtime export: ${name}`);
        const implementation = runtimeChecker.getAliasedSymbol(symbol).valueDeclaration;
        if (!implementation || !ts.isFunctionDeclaration(implementation))
            throw new Error(`Unsupported runtime component declaration: ${name}`);
        const wrapper = implementation.getSourceFile();
        const aliases = new Map(
            wrapper.statements.filter(ts.isTypeAliasDeclaration).map((alias) => [alias.name.text, alias.type]),
        );
        componentMetadata.set(name, { category, group: group?.trim() });
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

        // Preserve existing public prop aliases while deriving every component signature from its implementation.
        const propText = editorType(props?.getText(wrapper) ?? '{}');
        const generics = implementation.typeParameters?.length
            ? `<${implementation.typeParameters.map((type) => type.getText(wrapper)).join(', ')}>`
            : '';
        const alias = editor.statements.find(
            (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === `${name}Props`,
        );
        if (alias)
            replacements.push({
                start: alias.type.getStart(editor),
                end: alias.type.end,
                text: propText,
            });

        // Components keep the public JSX contract, including marker children whose implementations return null.
        let parameters;
        let returnType;
        if (
            category !== 'Runtime' &&
            (parameter?.name.getText(wrapper) === 'props' ||
                parameter?.name.getText(wrapper) === '_props' ||
                (parameter && ts.isObjectBindingPattern(parameter.name)))
        ) {
            parameters = `props: ${alias ? alias.name.text : propText}`;
            returnType = 'React.JSX.Element';
        } else {
            // Helpers retain their actual argument names, optional defaults, and explicit return contracts.
            parameters = implementation.parameters
                .map((parameter) => {
                    if (!parameter.type) throw new Error(`Missing runtime parameter type: ${name}`);
                    return `${parameter.dotDotDotToken ? '...' : ''}${parameter.name.getText(wrapper)}${
                        parameter.questionToken || parameter.initializer ? '?' : ''
                    }: ${editorType(parameter.type.getText(wrapper))}`;
                })
                .join(', ');
            if (!implementation.type) throw new Error(`Missing runtime return type: ${name}`);
            returnType = editorType(implementation.type.getText(wrapper));
        }
        componentDeclarations.push(
            `/** ${overview ? `${overview} ` : ''}@category ${category}${group ? ` @group ${group.trim()}` : ''} */\n` +
                `declare function ${name}${generics}(${parameters}): ${returnType};`,
        );
    }
}

// Replace the complete generated component section; editor support types and runtime APIs remain authored separately.
const componentStart = '// BEGIN GENERATED COMPONENTS';
const componentEnd = '// END GENERATED COMPONENTS';
const start = source.indexOf(componentStart);
const end = source.indexOf(componentEnd);
if (start === -1 || end < start) throw new Error('Missing generated component section in frontend.d.ts');
replacements.push({
    start: start + componentStart.length,
    end,
    text: `\n// Generated from web/src/views/components.ts by vp run generate:docs. Do not edit.\n\n${componentDeclarations.join('\n\n')}\n\n`,
});

// Keep the common field contract synchronized with the wrappers that consume it.
const fields = runtimeProgram.getSourceFile(path.join(root, 'src/components/ui/types.ts'));
if (!fields) throw new Error('Missing runtime field types: src/components/ui/types.ts');

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

// Reuse one printer for property types with the same formatting configuration.
const printer = ts.createPrinter();

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
    const text = printer.printNode(
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

// Inventory component exports directly; only runtime APIs retain separately authored editor membership.
const catalogDeclarations = document.statements.filter((statement) =>
    ts.getJSDocTags(statement).some((tag) => tag.tagName.text === 'category' && tag.comment === 'Runtime'),
);
for (const name of componentMetadata.keys()) {
    const statement = document.statements.find(
        (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name,
    );
    if (!statement) throw new Error(`Missing generated component declaration: ${name}`);
    catalogDeclarations.push(statement);
}
const declarations = catalogDeclarations.flatMap((statement) => {
    const declaration = ts.isVariableStatement(statement) ? statement.declarationList.declarations[0] : statement;

    // Publish runtime bindings and their documented props, not editor-only types or namespaces.
    if (!ts.isVariableDeclaration(declaration) && !ts.isFunctionDeclaration(declaration)) return [];
    const name = declaration.name?.getText(document);
    if (!name) return [];

    // Keep guide-only bindings available to editors without publishing standalone catalog entries.
    const tags = ts.getJSDocTags(statement);
    if (tags.some((tag) => tag.tagName.text === 'ignore')) return [];

    // Component membership and metadata come exclusively from runtime exports; retain authored runtime APIs.
    const metadata = componentMetadata.get(name);
    const category = metadata?.category ?? tags.find((tag) => tag.tagName.text === 'category')?.comment;
    if (!metadata && category !== 'Runtime') throw new Error(`Unexpected standalone component declaration: ${name}`);
    if (typeof category !== 'string' || !documentationCategories.includes(category))
        throw new Error(`Unknown documentation category: ${name}: ${category}`);

    // Let related runtime declarations publish one shared documentation entry.
    const group = metadata ? metadata.group : tags.find((tag) => tag.tagName.text === 'group')?.comment;
    if (group !== undefined && (typeof group !== 'string' || !group.trim()))
        throw new Error(`Invalid documentation group: ${name}`);

    // Keep each public-props lookup with its existence check.
    const properties = publicProps.get(name);
    return [
        {
            name: group?.trim() ?? name,
            category,
            ...(category !== 'Runtime' && properties
                ? {
                      properties: properties.map((property) => ({
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

// Preserve member and property order within a group, and expose only the shared catalog contract.
const groups = new Map();
for (const entry of declarations) {
    const existing = groups.get(entry.name);
    if (existing) {
        if (existing.category !== entry.category)
            throw new Error(`Conflicting documentation categories: ${entry.name}`);
        if (entry.members) (existing.members ??= []).push(...entry.members);
        if (entry.properties) (existing.properties ??= []).push(...entry.properties);
    } else {
        groups.set(entry.name, entry);
    }
}
const components = [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));

// Read the same authored component content used by the Astryx website, pinned to the installed library.
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

    // Enrich exact public prop names without adding styling props or expanding grouped children.
    for (const property of entry.properties ?? []) {
        if (property.name === 'className') continue;

        // Match only properties already supported by this component's public declaration.
        const supported = (supportedProps ?? upstreamProps).find((candidate) => candidate.name === property.name);
        if (!supported) continue;

        // Preserve authored metadata and inherit upstream defaults only for optional props.
        const upstream = upstreamProps.find((candidate) => candidate.name === property.name);
        property.description ??= supported.description ?? upstream?.description ?? `The ${property.name} prop.`;
        property.default ??= supported.default ?? (supported.required ? undefined : upstream?.default);
    }

    entry.introduction =
        introductions.get(entry.name) ?? detail.usage?.description ?? detail.description ?? usage?.description ?? '';
}

// Keep inline default labels out of descriptions when a separate default is documented.
for (const entry of components) {
    for (const property of entry.properties ?? []) {
        if (property.default !== undefined && property.default !== '-')
            property.description = property.description?.replace(/\s+\(default\)/gi, '');

        // Describe named sizes without embedding their pixel dimensions.
        if (property.name === 'size')
            property.description = property.description?.replace(/\s*\([^)]*\d+(?:x\d+)?px[^)]*\)/g, '');
    }
}

/** Converts literal JavaScript defaults to native YAML values without executing expressions. */
function nativeDefault(value) {
    // Parse the expression with the same TypeScript parser used for the declaration catalog.
    const document = ts.createSourceFile('default.ts', `(${value})`, ts.ScriptTarget.Latest, true);
    const statement = document.statements[0];
    if (document.parseDiagnostics.length || !statement || !ts.isExpressionStatement(statement)) return value;

    /** Reads literal values from the parsed tree while preserving unsupported expression text. */
    function readLiteral(expression, fallback = expression.getText(document)) {
        // Unwrap grouping while retaining the original text for computed defaults.
        while (ts.isParenthesizedExpression(expression)) expression = expression.expression;

        // Preserve scalar types and remove JavaScript string-literal quoting.
        if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
        if (ts.isNumericLiteral(expression)) return Number(expression.text);
        if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
        if (expression.kind === ts.SyntaxKind.NullKeyword) return null;

        // Visit object members directly instead of parsing their source text again.
        if (
            ts.isObjectLiteralExpression(expression) &&
            expression.properties.every(
                (property) =>
                    ts.isPropertyAssignment(property) &&
                    (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name))
            )
        )
            return Object.fromEntries(
                expression.properties.map((property) => [property.name.text, readLiteral(property.initializer)])
            );
        return fallback;
    }

    return readLiteral(statement.expression, value);
}

// Publish one YAML catalog for both the CLI and website.
const catalog = components.map(({ properties, ...component }) => ({
    ...component,
    introduction: component.introduction ?? '',
    ...(properties
        ? {
              properties: properties.map(({ name, type, description, default: defaultValue }) => ({
                  name,
                  type,
                  description,
                  ...(defaultValue !== undefined && defaultValue !== '-' ? { default: nativeDefault(defaultValue) } : {}),
              })),
          }
        : {}),
}));
const outputs = [
    { filename: input, text: source },
    {
        filename: path.resolve(root, '../sdk/longlink/.static/jsx/components.yml'),
        text: yaml
            .stringify(catalog)
            .replace(/\n- name:/g, '\n\n\n- name:')
            .replace(/(?<!  properties:)\n    - name:/g, '\n\n    - name:'),
    },
];

// CLI and website documentation share one generated catalog; checking must not modify files.
for (const { filename, text } of outputs) {
    const current = await readFile(filename, 'utf8').catch((error) => {
        // Only a missing output is regenerable; surface permission and other I/O failures.
        if (error.code === 'ENOENT') return undefined;
        throw error;
    });
    if (current !== text) {
        if (process.argv.includes('--check')) {
            console.error(`Generated documentation is stale: ${filename}`);
            process.exitCode = 1;
        } else {
            await writeFile(filename, text, 'utf8');
        }
    }
}

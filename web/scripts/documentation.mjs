import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.resolve(root, 'src/lib/generated/documentation.ts');
const schemaPath = path.resolve(root, '../sdk/longlink/.static/xsd/schema.xsd');
const typesPath = path.resolve(root, '../sdk/longlink/.static/xsd/types.xsd');
const parser = new XMLParser({
    attributeNamePrefix: '',
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: false,
});

// Read category order from the shared XML source.
const schemaSource = await readFile(schemaPath, 'utf8');
const schemaDocument = parseDocument(schemaSource, 'sdk/longlink/.static/xsd/schema.xsd');
const categories = nodes(appInfo(schemaDocument), 'longlink:category').map((category) => ({
    name: attribute(category, 'name'),
}));

/** Returns an object-shaped XML node. */
function record(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

/** Returns object-shaped child nodes with a given XML name. */
function nodes(value, name) {
    const child = value?.[name];
    const entries = Array.isArray(child) ? child : [child];

    return entries.flatMap((entry) => {
        const childRecord = record(entry);
        return childRecord !== undefined ? [childRecord] : [];
    });
}

/** Returns a string-valued XML attribute or an empty string. */
function attribute(value, name) {
    const entry = value?.[name];
    return typeof entry === 'string' ? entry : '';
}

/** Returns the first object-shaped child node with a given XML name. */
function firstNode(value, name) {
    const child = value?.[name];
    if (!Array.isArray(child)) {
        return record(child);
    }

    for (const entry of child) {
        const childRecord = record(entry);
        if (childRecord !== undefined) {
            return childRecord;
        }
    }

    return undefined;
}

/** Returns trimmed XML element text. */
function text(value) {
    const entry = typeof value === 'string' ? value : record(value)?.['#text'];
    return typeof entry === 'string' ? entry.trim() : '';
}

/** Returns an element's XSD annotation. */
function annotation(value) {
    return firstNode(value, 'xsd:annotation');
}

/** Returns an element's documentation text. */
function documentation(value) {
    return text(annotation(value)?.['xsd:documentation']);
}

/** Returns an element's application metadata. */
function appInfo(value) {
    return firstNode(annotation(value), 'xsd:appinfo');
}

/** Parses and validates one XSD source document. */
function parseDocument(source, sourcePath) {
    const validation = XMLValidator.validate(source);
    if (validation !== true) {
        throw new Error(`Cannot parse ${sourcePath}: ${validation.err.msg}`);
    }

    const schema = record(record(parser.parse(source))?.['xsd:schema']);
    if (schema === undefined) {
        throw new Error(`Cannot parse ${sourcePath}: Missing xsd:schema root.`);
    }

    return schema;
}

/** Returns documented attributes, including shared runtime attributes where declared. */
function attributes(type, runtimeAttributes) {
    if (type === undefined) {
        return [];
    }

    const declared = nodes(type, 'xsd:attribute').map((entry) => ({
        description: documentation(entry),
        name: attribute(entry, 'name'),
    }));
    const usesRuntimeAttributes = nodes(type, 'xsd:attributeGroup').some(
        (group) => attribute(group, 'ref') === 'XmlRuntimeAttributes'
    );

    return usesRuntimeAttributes ? [...declared, ...runtimeAttributes] : declared;
}

/** Returns documentation for one XSD element. */
function parseElement(element, types, runtimeAttributes) {
    const inlineType = firstNode(element, 'xsd:complexType');
    const typeName = attribute(element, 'type');
    const info = appInfo(element);

    return {
        attributes: attributes(inlineType ?? types.get(typeName), runtimeAttributes),
        description: documentation(element),
        example: text(info?.['longlink:example']),
        name: attribute(element, 'name') || attribute(element, 'ref'),
    };
}

/** Yields nested element declarations, expanding shared XSD groups in document order. */
function* collectNestedElements(value, groups) {
    const entry = record(value);
    if (entry === undefined) {
        return;
    }

    for (const [name, child] of Object.entries(entry)) {
        if (name === 'xsd:element') {
            yield* nodes(entry, name);
        }

        // Group references contribute the same local declarations as inline particles.
        if (name === 'xsd:group') {
            for (const group of nodes(entry, name)) {
                const reference = attribute(group, 'ref');
                if (reference) {
                    const definition = groups.get(reference);
                    if (definition === undefined) {
                        throw new Error(`Unknown XSD group: ${reference}`);
                    }
                    yield* collectNestedElements(definition, groups);
                }
            }
        }

        if (Array.isArray(child)) {
            for (const item of child) {
                yield* collectNestedElements(item, groups);
            }
        } else {
            yield* collectNestedElements(child, groups);
        }
    }
}

/** Returns undocumented elements referenced by a component's documentation. */
function companionNames(component, elements) {
    const names = new Set();
    const content = `${component.description}\n${component.example}`;

    for (const [name, { element }] of elements) {
        const isDocumentedComponent = record(appInfo(element)?.['longlink:docs']) !== undefined;

        if (name !== component.name && !isDocumentedComponent && new RegExp(`\\b${name}\\b`).test(content)) {
            names.add(name);
        }
    }

    return names;
}

/** Generates component documentation from the SDK XSD source contracts. */
async function componentDocumentation() {
    const typesSource = await readFile(typesPath, 'utf8');
    const typesDocument = parseDocument(typesSource, 'sdk/longlink/.static/xsd/types.xsd');
    const runtimeGroup = nodes(typesDocument, 'xsd:attributeGroup').find(
        (group) => attribute(group, 'name') === 'XmlRuntimeAttributes'
    );
    const runtimeAttributes = attributes(runtimeGroup, []);
    const filenames = nodes(schemaDocument, 'xsd:include')
        .map((include) => attribute(include, 'schemaLocation'))
        .filter((location) => location.startsWith('adapters/') && location.endsWith('.xsd'))
        .sort();
    const documents = [{ schema: typesDocument, source: path.basename(typesPath) }];

    for (const filename of filenames) {
        const source = await readFile(path.join(path.dirname(schemaPath), filename), 'utf8');
        documents.push({ schema: parseDocument(source, filename), source: filename });
    }

    const elements = new Map();
    const types = new Map();
    const groups = new Map();

    for (const { schema, source } of documents) {
        for (const element of nodes(schema, 'xsd:element')) {
            const name = attribute(element, 'name');
            if (name) {
                elements.set(name, { element, source });
            }
        }

        for (const type of nodes(schema, 'xsd:complexType')) {
            const name = attribute(type, 'name');
            if (name) {
                types.set(name, type);
            }
        }

        for (const group of nodes(schema, 'xsd:group')) {
            const name = attribute(group, 'name');
            if (name) {
                groups.set(name, group);
            }
        }
    }

    return Array.from(elements.values()).flatMap(({ element, source }) => {
        const metadata = record(appInfo(element)?.['longlink:docs']);
        if (metadata === undefined) {
            return [];
        }

        const component = parseElement(element, types, runtimeAttributes);
        const type = firstNode(element, 'xsd:complexType') ?? types.get(attribute(element, 'type'));
        const pending = Array.from(collectNestedElements(type, groups));

        // Resolve related declarations within this component, never mutating the global catalog.
        for (const name of companionNames(component, elements)) {
            pending.push(elements.get(name).element);
        }
        const nested = new Map();
        for (const declaration of pending) {
            const reference = attribute(declaration, 'ref');
            const name = reference || attribute(declaration, 'name');
            if (!name || name === component.name || nested.has(name)) {
                continue;
            }
            const child = reference ? elements.get(reference)?.element : declaration;
            if (child === undefined) {
                throw new Error(`Unknown XSD element: ${reference}`);
            }
            nested.set(name, child);
            const childType = firstNode(child, 'xsd:complexType') ?? types.get(attribute(child, 'type'));
            pending.push(...collectNestedElements(childType, groups));
        }

        return [
            {
                ...component,
                category: attribute(metadata, 'category'),
                lastUpdated: attribute(metadata, 'lastUpdated'),
                nested: Array.from(nested.values()).map((child) => parseElement(child, types, runtimeAttributes)),
                slug: attribute(metadata, 'slug'),
                source,
            },
        ];
    });
}

const components = await componentDocumentation();

// Runtime concepts share the same source and publishing contract as components.
components.push(
    ...nodes(appInfo(schemaDocument), 'longlink:topic').map((topic) => ({
        attributes: [],
        category: attribute(topic, 'category'),
        description: text(topic['longlink:description']),
        example: text(topic['longlink:example']),
        lastUpdated: attribute(topic, 'lastUpdated'),
        name: attribute(topic, 'name'),
        nested: [],
        slug: attribute(topic, 'slug'),
        source: path.basename(schemaPath),
    }))
);

// Reject invalid categories and ambiguous routes instead of silently omitting docs.
const slugs = new Set();
for (const component of components) {
    if (!categories.some(({ name }) => name === component.category)) {
        throw new Error(`Unknown documentation category for ${component.name}: ${component.category}`);
    }
    if (!component.slug || slugs.has(component.slug)) {
        throw new Error(`Missing or duplicate documentation slug for ${component.name}`);
    }
    slugs.add(component.slug);
}
components.sort((left, right) => left.name.localeCompare(right.name));
const output = `// Generated by scripts/documentation.mjs from SDK XSD documentation metadata.\nexport type ComponentDocumentation = {\n    attributes: { description: string; name: string }[];\n    category: string;\n    description: string;\n    example: string;\n    lastUpdated: string;\n    name: string;\n    nested: { attributes: { description: string; name: string }[]; description: string; example: string; name: string }[];\n    slug: string;\n    source: string;\n};\n\nexport const documentationCategories: { name: string }[] = ${JSON.stringify(categories, null, 4)};\n\nexport const componentDocumentation: ComponentDocumentation[] = ${JSON.stringify(components, null, 4)};\n`;
const current = await readFile(outputPath, 'utf8').catch(() => undefined);

if (current !== output) {
    await writeFile(outputPath, output, 'utf8');
}

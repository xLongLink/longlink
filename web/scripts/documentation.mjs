import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adaptersDirectory = path.resolve(root, '../sdk/longlink/.static/xsd/adapters');
const outputPath = path.resolve(root, 'src/lib/generated/documentation.ts');
const typesPath = path.resolve(root, '../sdk/longlink/.static/xsd/types.xsd');
const parser = new XMLParser({
    attributeNamePrefix: '',
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: false,
});

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
        return childRecord ? [childRecord] : [];
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
    if (!schema) {
        throw new Error(`Cannot parse ${sourcePath}: Missing xsd:schema root.`);
    }

    return schema;
}

/** Returns documented attributes, including shared runtime attributes where declared. */
function attributes(type, runtimeAttributes) {
    if (!type) {
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

/** Yields nested element declarations in document order. */
function* collectNestedElements(value) {
    const entry = record(value);
    if (!entry) {
        return;
    }

    for (const [name, child] of Object.entries(entry)) {
        if (name === 'xsd:element') {
            yield* nodes(entry, name);
        }

        if (Array.isArray(child)) {
            for (const item of child) {
                yield* collectNestedElements(item);
            }
        } else {
            yield* collectNestedElements(child);
        }
    }
}

/** Returns undocumented elements referenced by a component's documentation. */
function companionNames(component, elements) {
    const names = new Set();
    const content = `${component.description}\n${component.example}`;

    for (const [name, element] of elements) {
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
    const filenames = await readdir(adaptersDirectory);
    const documents = [];

    for (const filename of filenames.sort()) {
        if (filename.endsWith('.xsd')) {
            const source = await readFile(path.join(adaptersDirectory, filename), 'utf8');
            documents.push(parseDocument(source, filename));
        }
    }

    const elements = new Map();
    const types = new Map();

    for (const document of documents) {
        for (const element of nodes(document, 'xsd:element')) {
            const name = attribute(element, 'name');
            if (name) {
                elements.set(name, element);
            }
        }

        for (const type of nodes(document, 'xsd:complexType')) {
            const name = attribute(type, 'name');
            if (name) {
                types.set(name, type);
            }
        }
    }

    return Array.from(elements.values()).flatMap((element) => {
        const metadata = record(appInfo(element)?.['longlink:docs']);
        if (!metadata) {
            return [];
        }

        const component = parseElement(element, types, runtimeAttributes);
        const nestedNames = companionNames(component, elements);
        const type = types.get(attribute(element, 'type'));

        for (const nestedElement of collectNestedElements(type)) {
            const name = attribute(nestedElement, 'name');
            if (name && name !== component.name) {
                nestedNames.add(name);
                if (!elements.has(name)) {
                    elements.set(name, nestedElement);
                }
            }
        }

        return [
            {
                ...component,
                lastUpdated: attribute(metadata, 'lastUpdated'),
                nested: Array.from(nestedNames).flatMap((name) => {
                    const nested = elements.get(name);
                    return nested === undefined ? [] : [parseElement(nested, types, runtimeAttributes)];
                }),
                slug: attribute(metadata, 'slug'),
                source: attribute(metadata, 'source'),
            },
        ];
    });
}

const components = await componentDocumentation();
const output = `// Generated by scripts/documentation.mjs from SDK XSD documentation metadata.\nexport type ComponentDocumentation = {\n    attributes: { description: string; name: string }[];\n    description: string;\n    example: string;\n    lastUpdated: string;\n    name: string;\n    nested: { attributes: { description: string; name: string }[]; description: string; example: string; name: string }[];\n    slug: string;\n    source: string;\n};\n\nexport const componentDocumentation: ComponentDocumentation[] = ${JSON.stringify(components, null, 4)};\n`;
const current = await readFile(outputPath, 'utf8').catch(() => undefined);

if (current !== output) {
    await writeFile(outputPath, output, 'utf8');
}

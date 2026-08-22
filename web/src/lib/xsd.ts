import { XMLParser, XMLValidator } from 'fast-xml-parser';

type Attribute = { name: string; description: string };
type XsdNode = string | XsdNode[] | { [key: string]: XsdNode };
type XsdRecord = { [key: string]: XsdNode };

type ElementDocumentation = {
    attributes: Attribute[];
    description: string;
    example: string;
    name: string;
};

export type ComponentDocumentation = ElementDocumentation & {
    category: string;
    lastUpdated: string;
    nested: ElementDocumentation[];
    slug: string;
    source: string;
};

const parser = new XMLParser({
    attributeNamePrefix: '',
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: false,
});
const adapterSources = import.meta.glob<string>('../../../sdk/longlink/.static/xsd/adapters/*.xsd', {
    eager: true,
    import: 'default',
    query: '?raw',
});
const typeSources = import.meta.glob<string>('../../../sdk/longlink/.static/xsd/types.xsd', {
    eager: true,
    import: 'default',
    query: '?raw',
});

function record(value: XsdNode | undefined): XsdRecord | undefined {
    return value != null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function nodes(value: XsdRecord | undefined, name: string): XsdRecord[] {
    const child = value?.[name];
    const entries = Array.isArray(child) ? child : child == null ? [] : [child];

    return entries.flatMap((entry) => {
        const childRecord = record(entry);
        return childRecord ? [childRecord] : [];
    });
}

function attribute(value: XsdRecord | undefined, name: string): string {
    const entry = value?.[name];
    return typeof entry === 'string' ? entry : '';
}

function text(value: XsdNode | undefined): string {
    if (typeof value === 'string') {
        return value.trim();
    }

    const entry = record(value)?.['#text'];
    return typeof entry === 'string' ? entry.trim() : '';
}

function annotation(value: XsdRecord): XsdRecord | undefined {
    return nodes(value, 'xsd:annotation')[0];
}

function documentation(value: XsdRecord): string {
    return text(annotation(value)?.['xsd:documentation']);
}

function appInfo(value: XsdRecord): XsdRecord | undefined {
    return nodes(annotation(value), 'xsd:appinfo')[0];
}

function parseDocument(source: string, path: string): XsdRecord {
    const validation = XMLValidator.validate(source);
    if (validation !== true) {
        throw new Error(`Cannot parse ${path}: ${validation.err.msg}`);
    }

    const schema = record(record(parser.parse(source))?.['xsd:schema']);
    if (!schema) {
        throw new Error(`Cannot parse ${path}: Missing xsd:schema root.`);
    }

    return schema;
}

function attributes(type: XsdRecord | undefined, runtimeAttributes: Attribute[]): Attribute[] {
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

function parseElement(
    element: XsdRecord,
    types: Map<string, XsdRecord>,
    runtimeAttributes: Attribute[]
): ElementDocumentation {
    const inlineType = nodes(element, 'xsd:complexType')[0];
    const typeName = attribute(element, 'type');
    const info = appInfo(element);

    return {
        attributes: attributes(inlineType ?? types.get(typeName), runtimeAttributes),
        description: documentation(element),
        example: text(info?.['longlink:example']),
        name: attribute(element, 'name') || attribute(element, 'ref'),
    };
}

function collectNestedElements(value: XsdNode | undefined): XsdRecord[] {
    const entry = record(value);
    if (!entry) {
        return [];
    }

    return Object.entries(entry).flatMap(([name, child]) => [
        ...(name === 'xsd:element' ? nodes({ [name]: child }, name) : []),
        ...(Array.isArray(child) ? child.flatMap(collectNestedElements) : collectNestedElements(child)),
    ]);
}

function companionNames(component: ElementDocumentation, elements: Map<string, XsdRecord>): Set<string> {
    const names = new Set<string>();
    const content = `${component.description}\n${component.example}`;

    for (const [name, element] of elements) {
        const isDocumentedComponent = record(appInfo(element)?.['longlink:docs']) !== undefined;

        if (name !== component.name && !isDocumentedComponent && new RegExp(`\\b${name}\\b`).test(content)) {
            names.add(name);
        }
    }

    return names;
}

function parseComponents(): ComponentDocumentation[] {
    const typesSource = Object.entries(typeSources)[0];
    if (!typesSource || typeof typesSource[1] !== 'string') {
        throw new Error('Vite did not load the shared XSD types source.');
    }

    const typesDocument = parseDocument(typesSource[1], typesSource[0]);
    const runtimeGroup = nodes(typesDocument, 'xsd:attributeGroup').find(
        (group) => attribute(group, 'name') === 'XmlRuntimeAttributes'
    );
    const runtimeAttributes = attributes(runtimeGroup, []);
    const documents = Object.entries(adapterSources).map(([path, source]) => {
        if (typeof source !== 'string') {
            throw new Error(`Vite did not load ${path} as a raw XSD string.`);
        }

        return parseDocument(source, path);
    });
    const elements = new Map<string, XsdRecord>();
    const types = new Map<string, XsdRecord>();

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
                category: attribute(metadata, 'category'),
                lastUpdated: attribute(metadata, 'lastUpdated'),
                nested: Array.from(nestedNames)
                    .map((name) => elements.get(name))
                    .filter((nested): nested is XsdRecord => nested !== undefined)
                    .map((nested) => parseElement(nested, types, runtimeAttributes)),
                slug: attribute(metadata, 'slug'),
                source: attribute(metadata, 'source'),
            },
        ];
    });
}

export const componentDocumentation = parseComponents();

export function componentBySlug(slug: string | undefined): ComponentDocumentation | undefined {
    return componentDocumentation.find((component) => component.slug === slug);
}

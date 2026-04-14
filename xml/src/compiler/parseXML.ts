import { XMLParser } from 'fast-xml-parser';
import type { ASTNode } from '../types';

const TEXT_NODE_NAME = '#text';
const ATTRIBUTES_NODE_NAME = ':@';

const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: TEXT_NODE_NAME,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    ignoreDeclaration: true,
});

type PreserveOrderNode = Record<string, any>;

export function xmlToAST(xml: string): ASTNode[] {
    const parsed = parser.parse(xml) as PreserveOrderNode[];

    const children: ASTNode[] = [];

    for (const entry of parsed) {
        const node = convertNode(entry);
        if (node) children.push(node);
    }

    return children;
}

function convertNode(entry: PreserveOrderNode): ASTNode | null {
    const nodeName = Object.keys(entry).find((key) => key !== ATTRIBUTES_NODE_NAME);
    if (!nodeName) return null;

    /* Text Node */
    if (nodeName === TEXT_NODE_NAME) {
        const text = entry[TEXT_NODE_NAME];

        if (typeof text === 'string' && text.trim() !== '') {
            return { name: 'text', value: text };
        }

        return null;
    }

    /* Element Node */
    const rawAttributes = entry[ATTRIBUTES_NODE_NAME];
    const params: Record<string, string> = {};
    if (rawAttributes && typeof rawAttributes === 'object') {
        for (const [key, value] of Object.entries(rawAttributes)) {
            if (typeof value === 'string') {
                params[key] = value;
            }
        }
    }

    const childrenRaw = entry[nodeName];
    const children: ASTNode[] = [];

    if (Array.isArray(childrenRaw)) {
        for (const child of childrenRaw) {
            const converted = convertNode(child as PreserveOrderNode);
            if (converted) children.push(converted);
        }
    }

    return {
        name: nodeName,
        ...(Object.keys(params).length > 0 && { params }),
        ...(children.length > 0 && { children }),
    };
}

if (import.meta.main) {
    const sampleXML = `
        <note id="1">
            <to>User</to>
            <from>System</from>
            <message>Hello World</message>
        </note>
    `;

    const ast = xmlToAST(sampleXML);

    console.log(JSON.stringify(ast, null, 2));
}

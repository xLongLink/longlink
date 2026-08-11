import * as v1 from './v1';
import type { ASTNode } from './v1/types';

/** Parses one XML document and verifies its declared runtime syntax. */
export function parseXML(xml: string): ASTNode[] {
    const ast = v1.parseXML(xml);

    validateRuntime(ast);
    return ast;
}

/** Validate the runtime declared by a complete XML document root. */
function validateRuntime(ast: ASTNode[]): void {
    const [root] = ast;

    // XML pages have one versioned LongLink root.
    if (ast.length !== 1 || root?.name !== 'longlink') {
        throw new Error('XML pages must contain exactly one longlink root');
    }

    const version = root.params?.version?.kind === 'text' ? root.params.version.value : undefined;

    // Do not render documents for a runtime this bundle does not include.
    if (version !== v1.XML_SYNTAX_VERSION) {
        throw new Error(`Unsupported LongLink XML syntax version: ${version ?? 'missing'}`);
    }
}

export { createContext, RenderXML, resolveRequestUrl } from './v1';
export type { ASTNode, RuntimeServices, Scope, XmlRuntime } from './v1';

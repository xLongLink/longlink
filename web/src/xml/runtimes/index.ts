import * as v0_3 from './0.3';
import type { ASTNode } from './0.3/types';

type XmlRuntime = {
    render: typeof v0_3.RenderXML;
};

const runtimes: Record<string, XmlRuntime> = {
    '0.3': { render: v0_3.RenderXML },
};

/** Returns the declared XML runtime version from a complete document AST. */
export function getXmlRuntimeVersion(ast: ASTNode[]): string {
    const [root] = ast;
    const version = root?.params?.version;

    if (ast.length !== 1 || root?.name !== 'longlink' || version?.kind !== 'text') {
        throw new Error('XML pages must contain exactly one versioned longlink root');
    }

    return version.value;
}

/** Returns the installed renderer for an XML document version. */
export function getXmlRuntime(version: string): XmlRuntime {
    const runtime = runtimes[version];
    if (!runtime) throw new Error(`Unsupported LongLink XML runtime version: ${version}`);

    return runtime;
}

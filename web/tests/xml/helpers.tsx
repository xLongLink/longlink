import { vi } from 'vitest';
import * as xml from '@/xml';
import { ApiProvider } from '@/providers';
import * as context from '@/xml/core/context';
import { createQueryRuntime } from '@/lib/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { compileAttribute } from '@/xml/expressions/compile';
import type { ASTNode, ASTProps, XmlRuntime } from '@/xml/types';

/** Creates an isolated query runtime with deterministic test defaults. */
export function createTestQueryRuntime() {
    // Keep background retries and act warnings identical across runtime suites.
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const runtime = createQueryRuntime(vi.fn(), false);
    runtime.client.setDefaultOptions({ queries: { retry: false } });

    return runtime;
}

/** Creates a complete XML runtime with inert host services for tests. */
export function createContext(options: Partial<context.CreateContextOptions> = {}): XmlRuntime {
    return context.createContext({
        navigate: () => {},
        navigationBaseUrl: '',
        params: {},
        requestBaseUrl: '',
        ...options,
    });
}

/** Parses fragment fixtures through the document parser and returns their children. */
export function parseFragment(fragment: string): ASTNode[] {
    return xml.parseXML(`<longlink>${fragment}</longlink>`).children;
}

/** Compiles string fixture attributes through the same document compiler rules. */
export function compileProps(props: Record<string, string>): ASTProps {
    return Object.fromEntries(Object.entries(props).map(([name, value]) => [name, compileAttribute(value)]));
}

/** Renders the real XML runtime with application-owned error reporting. */
export function RenderXML(props: { ast: ASTNode; ctx: XmlRuntime }) {
    return (
        <LayerProvider>
            <ApiProvider>
                <xml.RenderXML {...props} />
            </ApiProvider>
        </LayerProvider>
    );
}

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: XmlRuntime = createContext()): string {
    return renderToStaticMarkup(<RenderXML ast={{ name: 'longlink', params: {}, children: ast }} ctx={ctx} />);
}

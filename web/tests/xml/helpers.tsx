import { act } from 'react';
import { vi } from 'vitest';
import * as xml from '@/xml';
import type { ReactNode } from 'react';
import { ApiProvider } from '@/providers';
import * as context from '@/xml/core/context';
import { createRoot } from 'react-dom/client';
import type { ASTNode, XmlRuntime } from '@/xml/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { LayerProvider } from '@astryxdesign/core/Layer';

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

/** Unmounts a test root created with createRoot. */
export async function cleanupMountedRoot(root: ReturnType<typeof createRoot> | undefined): Promise<void> {
    // Keep mounted-root lifetime in one owner so suites only handle their own globals.
    if (root) {
        const mountedRoot = root;
        await act(async () => mountedRoot.unmount());
    }
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

/** Mounts an XML fragment through the real runtime and returns its container and root. */
export async function mountXml(
    fragment: string,
    ctx: XmlRuntime = createContext(),
    wrap?: (node: ReactNode) => ReactNode,
    attach = false
) {
    // Keep attached versus detached DOM identical to each suite's previous behavior.
    const container = document.createElement('div');

    if (attach) {
        document.body.append(container);
    }

    const root = createRoot(container);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

    // Render through the real XML runtime with application-owned error reporting.
    await act(async () => {
        const node = <RenderXML ast={xml.parseXML(`<longlink>${fragment}</longlink>`)} ctx={ctx} />;

        root.render(wrap ? wrap(node) : node);
    });

    return { container, root, ctx };
}

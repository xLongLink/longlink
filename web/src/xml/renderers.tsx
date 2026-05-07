import { XmlErrorBoundary } from '@xml/core/errors';
import { renderNode } from '@xml/core/node';
import { RuntimeProvider, setupContext } from '@xml/core/runtime';
import { BaseUrlContext } from '@xml/core/url';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { useEffect, useState } from 'react';

/**
 * Internal React component that owns XML initialization hooks.
 */
function XmlRenderer({ ast, ctx, baseUrl }: { ast: ASTNode[]; ctx: ExecutionContext; baseUrl: string }) {
    const [initializedCtx, setInitializedCtx] = useState<ExecutionContext | null>(null);

    useEffect(() => {
        let active = true;

        (async () => {
            await setupContext(ast, ctx, baseUrl);

            if (active) setInitializedCtx(ctx);
        })().catch((error) => {
            if (active) throw error;
        });

        return () => {
            active = false;
        };
    }, [ast, ctx]);

    // TODO: Given that we already have the ast, this can create a skeleton UI.
    if (!initializedCtx) return <div>Loading</div>;

    return (
        <XmlErrorBoundary resetKey={ast}>
            <BaseUrlContext.Provider value={baseUrl}>
                <RuntimeProvider value={initializedCtx}>{renderNode(ast, initializedCtx)}</RuntimeProvider>
            </BaseUrlContext.Provider>
        </XmlErrorBoundary>
    );
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext, baseUrl = ''): ReactNode {
    return <XmlRenderer ast={ast} ctx={ctx} baseUrl={baseUrl} />;
}

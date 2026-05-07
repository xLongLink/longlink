import { XmlErrorBoundary } from '@xml/core/errors';
import { renderNode } from '@xml/core/node';
import { RuntimeProvider, setupContext } from '@xml/core/runtime';
import { BaseUrlContext } from '@xml/core/url';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { useEffect, useState, type ReactNode } from 'react';

type RenderXMLProps = {
    ast: ASTNode[];
    ctx: ExecutionContext;
    baseUrl?: string;
};

/**
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function RenderXML({ ast, ctx, baseUrl = '' }: RenderXMLProps): ReactNode {
    function RenderTree() {
        const [initializedCtx, setInitializedCtx] = useState<ExecutionContext | null>(null);
        const [version, setVersion] = useState(0);

        useEffect(() => {
            let active = true;

            ctx.invalidate = async (ids) => {
                const list = Array.isArray(ids) ? ids : [ids];

                for (const id of list) {
                    const setup = ctx.setups.find((entry) => entry.id === id)?.setup;

                    if (!setup) continue;

                    delete ctx.values[id];
                    await setup();
                }

                setVersion((current) => current + 1);
            };

            (async () => {
                await setupContext(ast, ctx, baseUrl);

                if (active) setInitializedCtx(ctx);
            })().catch((error) => {
                if (active) throw error;
            });

            return () => {
                active = false;
                ctx.invalidate = undefined;
            };
        }, [ast, ctx, baseUrl]);

        // TODO: Given that we already have the ast, this can create a skeleton UI.
        if (!initializedCtx) return <div>Loading</div>;

        return (
            <XmlErrorBoundary resetKey={`${version}`}>
                <BaseUrlContext.Provider value={baseUrl}>
                    <RuntimeProvider value={initializedCtx}>{renderNode(ast, initializedCtx)}</RuntimeProvider>
                </BaseUrlContext.Provider>
            </XmlErrorBoundary>
        );
    }

    return <RenderTree />;
}

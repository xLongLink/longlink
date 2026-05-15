import { ContextProvider, createContext, setupContext } from '@xml/core/context';
import { XmlErrorBoundary } from '@xml/core/errors';
import { renderNode } from '@xml/core/node';
import { BaseUrlContext } from '@xml/core/url';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { useEffect, useState, type ReactNode } from 'react';

type RenderXMLProps = {
    ast: ASTNode[];
    ctx?: ExecutionContext;
    baseUrl?: string;
};

/**
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function RenderXML({ ast, ctx, baseUrl = '' }: RenderXMLProps): ReactNode {
    const [runtimeCtx] = useState<ExecutionContext>(() => ctx ?? createContext());

    const [version, setVersion] = useState(0);

    useEffect(() => {
        let active = true;

        /* Attach the renderer-owned invalidation hook before async setup runs. */
        runtimeCtx.invalidate = async (ids) => {
            const list = Array.isArray(ids) ? ids : [ids];

            for (const id of list) {
                const setup = runtimeCtx.setups[id];

                if (!setup) continue;

                delete runtimeCtx.values[id];
                await setup();
            }

            setVersion((current) => current + 1);
        };

        (async () => {
            await setupContext(ast, runtimeCtx, baseUrl);

            if (active) setVersion((current) => current + 1);
        })().catch((error) => {
            if (active) throw error;
        });

        return () => {
            active = false;
        };
    }, [ast, runtimeCtx, baseUrl]);

    return (
        <XmlErrorBoundary resetKey={`${version}`}>
            <BaseUrlContext.Provider value={baseUrl}>
                <ContextProvider value={runtimeCtx}>{renderNode(ast, runtimeCtx)}</ContextProvider>
            </BaseUrlContext.Provider>
        </XmlErrorBoundary>
    );
}

import { getVersion, subscribe } from 'valtio';
import { Stack } from '@astryxdesign/core-0-3/Stack';
import { useEffect, useMemo, useState } from 'react';
import { Banner } from '@astryxdesign/core-0-3/Banner';
import type { ASTNode, XmlRuntime } from './types';
import { renderNode } from './core/node';
import { XmlErrorBoundary } from './core/errors';
import { createContext, getSetupNodes, setupContext, XmlContext } from './core/context';

type RenderXMLProps = {
    ast: [ASTNode];
    ctx?: XmlRuntime;
    baseUrl?: string;
};

/**
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function RenderXML({ ast, ctx, baseUrl = '' }: RenderXMLProps) {
    const [runtimeCtx] = useState<XmlRuntime>(() => ctx ?? createContext());
    runtimeCtx.services.requestBaseUrl = baseUrl;
    const setup = useMemo(() => {
        // Validate setup nodes before effects run.
        try {
            return { error: null, nodes: getSetupNodes(ast) };
        } catch (error: unknown) {
            return { error: error instanceof Error ? error : new Error('XML setup validation failed'), nodes: [] };
        }
    }, [ast]);
    const [initializedAst, setInitializedAst] = useState<ASTNode[] | null>(() => (setup.nodes.length ? null : ast));
    const [setupFailure, setSetupFailure] = useState<{ ast: ASTNode[]; baseUrl: string; error: unknown } | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const setupError = setupFailure?.ast === ast && setupFailure.baseUrl === baseUrl ? setupFailure.error : null;

    useEffect(() => {
        // Do not initialize an invalid document.
        if (setup.error) {
            return;
        }

        let mounted = true;
        let unsubscribers: Array<() => void> = [];

        /** Removes every Valtio subscription owned by this renderer. */
        function unsubscribeAll() {
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }

            unsubscribers = [];
        }

        /** Subscribes the renderer to every Valtio-backed state slot in the current page context. */
        function subscribeToStateValues() {
            // Remove previous subscriptions before rebuilding them.
            unsubscribeAll();

            // Subscribe to reactive state values in the context.
            for (const value of Object.values(runtimeCtx.scope.bindings)) {
                // Skip non-reactive context values.
                if (!value || typeof value !== 'object' || getVersion(value) === undefined) continue;

                unsubscribers.push(
                    subscribe(value, () => {
                        // Refresh only while this renderer is mounted.
                        if (mounted) setResetKey((current) => current + 1);
                    })
                );
            }
        }

        runtimeCtx.services.setups = {};
        runtimeCtx.scope.bindings = { params: runtimeCtx.scope.bindings.params };

        /* Attach the renderer-owned invalidation hook before async setup runs. */
        runtimeCtx.services.invalidate = async (ids) => {
            // Refresh each requested setup value.
            for (const id of ids) {
                // Skip unknown invalidation targets.
                const setup = runtimeCtx.services.setups[id];
                if (!setup) continue;

                delete runtimeCtx.scope.bindings[id];
                await setup();
            }

            subscribeToStateValues();
            setResetKey((current) => current + 1);
        };

        void setupContext(setup.nodes, runtimeCtx, baseUrl)
            .then(() => {
                subscribeToStateValues();

                // Publish initialized AST only while mounted.
                if (mounted) {
                    setInitializedAst(ast);
                    setResetKey((current) => current + 1);
                }
            })
            .catch((error) => {
                // Report setup failures only while mounted.
                if (mounted) setSetupFailure({ ast, baseUrl, error });
            });

        return () => {
            mounted = false;

            // Remove state subscriptions on unmount.
            unsubscribeAll();
        };
    }, [ast, runtimeCtx, baseUrl, setup]);

    // Show setup failures before rendering XML nodes.
    if (setup.error || setupError) {
        const visibleError = setup.error ?? setupError;

        return (
            <Banner status="error" title={visibleError instanceof Error ? visibleError.message : 'XML setup failed'} />
        );
    }

    // Wait for setup before rendering dependent nodes.
    if (setup.nodes.length && initializedAst !== ast) return null;

    return (
        <XmlErrorBoundary resetKey={resetKey}>
            <XmlContent ast={ast} ctx={runtimeCtx} />
        </XmlErrorBoundary>
    );
}

function XmlContent({ ast, ctx }: { ast: [ASTNode]; ctx: XmlRuntime }) {
    const [root] = ast;

    return (
        <XmlContext.Provider value={ctx}>
            <Stack gap={6}>{renderNode(root.children, ctx.scope)}</Stack>
        </XmlContext.Provider>
    );
}

import { useEffect, useMemo, useState } from 'react';
import { getVersion, subscribe } from 'valtio';
import { Stack } from '@astryxdesign/core-0-3/Stack';
import { Banner } from '@astryxdesign/core-0-3/Banner';
import type { ASTNode, XmlRuntime } from './types';
import { renderNode } from './core/node';
import { XmlErrorBoundary } from './core/errors';
import { createContext, setupContext, validateSetupNodes, XmlContext } from './core/context';

type RenderXMLProps = {
    ast: ASTNode[];
    ctx?: XmlRuntime;
    baseUrl?: string;
};

/**
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function RenderXML({ ast, ctx, baseUrl = '' }: RenderXMLProps) {
    const [runtimeCtx] = useState<XmlRuntime>(() => ctx ?? createContext());
    runtimeCtx.services.requestBaseUrl = baseUrl;
    const requiresSetup = getRequirements(ast);
    const [initializedAst, setInitializedAst] = useState<ASTNode[] | null>(() => (requiresSetup ? null : ast));
    const [setupFailure, setSetupFailure] = useState<{ ast: ASTNode[]; baseUrl: string; error: unknown } | null>(null);
    const [version, setVersion] = useState(0);
    const setupError = setupFailure?.ast === ast && setupFailure.baseUrl === baseUrl ? setupFailure.error : null;

    const setupValidationError = useMemo(() => {
        // Validate setup nodes before effects run.
        try {
            validateSetupNodes(ast);
            return null;
        } catch (error: unknown) {
            return error instanceof Error ? error : new Error('XML setup validation failed');
        }
    }, [ast]);

    useEffect(() => {
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
                        if (mounted) setVersion((current) => current + 1);
                    })
                );
            }
        }

        runtimeCtx.services.setups = {};
        runtimeCtx.scope.bindings = { params: runtimeCtx.scope.bindings.params };

        /* Attach the renderer-owned invalidation hook before async setup runs. */
        runtimeCtx.services.invalidate = async (ids) => {
            const list = Array.isArray(ids) ? ids : [ids];

            // Refresh each requested setup value.
            for (const id of list) {
                // Skip unknown invalidation targets.
                const setup = runtimeCtx.services.setups[id];
                if (!setup) continue;

                delete runtimeCtx.scope.bindings[id];
                await setup();
            }

            subscribeToStateValues();
            setVersion((current) => current + 1);
        };

        void setupContext(ast, runtimeCtx, baseUrl)
            .then(() => {
                subscribeToStateValues();

                // Publish initialized AST only while mounted.
                if (mounted) {
                    setInitializedAst(ast);
                    setVersion((current) => current + 1);
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
    }, [ast, runtimeCtx, baseUrl]);

    // Show setup failures before rendering XML nodes.
    if (setupValidationError || setupError) {
        const visibleError = setupValidationError ?? setupError;

        return (
            <Banner status="error" title={visibleError instanceof Error ? visibleError.message : 'XML setup failed'} />
        );
    }

    // Wait for setup before rendering dependent nodes.
    if (requiresSetup && initializedAst !== ast) return null;

    return (
        <XmlErrorBoundary resetKey={version}>
            <XmlContent ast={ast} ctx={runtimeCtx} />
        </XmlErrorBoundary>
    );
}

function XmlContent({ ast, ctx }: { ast: ASTNode[]; ctx: XmlRuntime }) {
    const [root] = ast;

    return (
        <XmlContext.Provider value={ctx}>
            {ast.length === 1 && root?.name === 'longlink' ? (
                <Stack gap={6}>{renderNode(root.children, ctx.scope)}</Stack>
            ) : (
                renderNode(ast, ctx.scope)
            )}
        </XmlContext.Provider>
    );
}

/** Returns whether setup nodes occur in an AST traversal. */
function getRequirements(nodes: ASTNode[]): boolean {
    let requiresSetup = false;

    // Walk the tree until a setup node is found.
    for (const node of nodes) {
        requiresSetup ||= node.name === 'State' || node.name === 'Query';
        if (requiresSetup) break;

        requiresSetup ||= getRequirements(node.children);
        if (requiresSetup) break;
    }

    return requiresSetup;
}

import { renderNode } from './core/node';
import { getVersion, subscribe } from 'valtio';
import { XmlErrorBoundary } from './core/errors';
import { Stack } from '@astryxdesign/core/Stack';
import { isSafePropertyName } from './expressions';
import type { ASTNode, XmlRuntime } from './types';
import { Banner } from '@astryxdesign/core/Banner';
import { setupContext, XmlContext } from './core/context';
import { useEffect, useMemo, useRef, useState } from 'react';

type RenderXMLProps = {
    ast: ASTNode;
    ctx: XmlRuntime;
    baseUrl: string;
};

/**
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function RenderXML({ ast, ctx, baseUrl }: RenderXMLProps) {
    ctx.services.requestBaseUrl = baseUrl;
    const setup = useMemo(() => {
        // Validate setup nodes before effects run.
        try {
            return { error: null, nodes: getSetupNodes(ast.children) };
        } catch (error: unknown) {
            return { error: error instanceof Error ? error : new Error('XML setup validation failed'), nodes: [] };
        }
    }, [ast]);
    const initializedAst = useRef<ASTNode | null>(setup.nodes.length ? null : ast);
    const [setupFailure, setSetupFailure] = useState<{ ast: ASTNode; baseUrl: string; error: unknown } | null>(null);
    const [, setRenderVersion] = useState(0);
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
            for (const value of Object.values(ctx.scope.bindings)) {
                // Skip non-reactive context values.
                if (!value || typeof value !== 'object' || getVersion(value) === undefined) continue;

                unsubscribers.push(
                    subscribe(value, () => {
                        // Refresh only while this renderer is mounted.
                        if (mounted) setRenderVersion((current) => current + 1);
                    })
                );
            }
        }

        ctx.services.setups = {};
        ctx.scope.bindings = { params: ctx.scope.bindings.params };

        /* Attach the renderer-owned invalidation hook before async setup runs. */
        ctx.services.invalidate = async (ids) => {
            // Refresh each requested setup value.
            for (const id of ids) {
                // Skip unknown invalidation targets.
                const setup = ctx.services.setups[id];
                if (!setup) continue;

                delete ctx.scope.bindings[id];
                await setup();
            }

            subscribeToStateValues();
            setRenderVersion((current) => current + 1);
        };

        void setupContext(setup.nodes, ctx)
            .then(() => {
                subscribeToStateValues();

                // Publish initialized AST only while mounted.
                if (mounted) {
                    initializedAst.current = ast;
                    setRenderVersion((current) => current + 1);
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
    }, [ast, ctx, baseUrl, setup]);

    // Show setup failures before rendering XML nodes.
    if (setup.error || setupError) {
        const visibleError = setup.error ?? setupError;

        return (
            <Banner status="error" title={visibleError instanceof Error ? visibleError.message : 'XML setup failed'} />
        );
    }

    // Wait for setup before rendering dependent nodes.
    if (setup.nodes.length && initializedAst.current !== ast) return null;

    return (
        <XmlErrorBoundary>
            <XmlContext.Provider value={ctx}>
                <Stack gap={6}>{renderNode(ast.children, ctx.scope)}</Stack>
            </XmlContext.Provider>
        </XmlErrorBoundary>
    );
}

/** Finds and validates State and Query declarations in document order. */
function getSetupNodes(nodes: ASTNode[]): ASTNode[] {
    const setupNodes: ASTNode[] = [];

    function walk(currentNodes: ASTNode[]): void {
        // Validate setup declarations before checking descendants.
        for (const node of currentNodes) {
            // Collect setup declarations outside loop-local scope.
            if (node.name === 'State' || node.name === 'Query') {
                validateSetupNode(node);
                setupNodes.push(node);
            }

            // Skip nested loop content because it has its own scope.
            if (node.name !== 'For') {
                walk(node.children);
            }
        }
    }

    walk(nodes);
    return setupNodes;
}

/** Validates a single setup-only runtime declaration. */
function validateSetupNode(node: ASTNode): void {
    // Validate state declarations.
    if (node.name === 'State') {
        // Require a declared state key.
        if (!node.params.id) throw new Error('State requires a string id');

        // Keep state keys static.
        if (node.params.id.kind !== 'text') throw new Error('State id must be literal text');

        // Prevent unsafe state property names.
        if (!node.params.id.value.trim() || !isSafePropertyName(node.params.id.value.trim())) {
            throw new Error('State id must be a safe property name');
        }

        const unsafeAttributes = Object.keys(node.params).filter((name) => name !== 'id' && !isSafePropertyName(name));

        // Reject unsafe state attribute names.
        if (unsafeAttributes.length) {
            throw new Error(`State attributes must be safe property names: ${unsafeAttributes.join(', ')}`);
        }

        // Keep State declarations leaf-only.
        if (node.children.length > 0) throw new Error('State cannot have children');
    }

    // Validate query declarations.
    else if (node.name === 'Query') {
        // Require a declared query key.
        if (!node.params.id) throw new Error('Query requires a string id');

        // Require a query source path.
        if (!node.params.path) throw new Error('Query requires a string path');

        // Keep Query declarations leaf-only.
        if (node.children.length > 0) throw new Error('Query cannot have children');

        // Keep query keys static.
        if (node.params.id.kind !== 'text') throw new Error('Query id must be literal text');

        // Prevent unsafe query property names.
        if (!node.params.id.value.trim() || !isSafePropertyName(node.params.id.value.trim())) {
            throw new Error('Query id must be a safe property name');
        }
    }
}

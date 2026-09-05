import { subscribe } from 'valtio';
import { renderNode } from './core/node';
import { isValtioProxy } from './core/state';
import { Stack } from '@astryxdesign/core/Stack';
import type { ASTNode, XmlRuntime } from './types';
import { Banner } from '@astryxdesign/core/Banner';
import { setupContext, XmlContext } from './core/context';
import { isSafePropertyName } from './expressions/resolve';
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

/** Keeps XML rendering failures scoped to the XML surface. */
class XmlErrorBoundary extends Component<{ ast: ASTNode; children: ReactNode }, { error: Error | null }> {
    state: { error: Error | null } = { error: null };

    /** Stores the thrown error so the XML area can render the message. */
    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidUpdate(previousProps: Readonly<{ ast: ASTNode; children: ReactNode }>) {
        // A new document must render independently from a previous document's failure.
        if (this.props.ast !== previousProps.ast && this.state.error) {
            this.setState({ error: null });
        }
    }

    /** Renders the XML error message or the protected XML subtree. */
    render() {
        // Render the captured XML error instead of children.
        if (this.state.error) {
            return <Banner status="error" title={this.state.error.message || 'XML rendering failed'} />;
        }

        return this.props.children;
    }
}

/**
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function RenderXML({ ast, ctx }: { ast: ASTNode; ctx: XmlRuntime }) {
    const setup = useMemo(() => {
        // Validate setup nodes before effects run.
        try {
            return { error: null, nodes: getSetupNodes(ast.children) };
        } catch (error: unknown) {
            return { error: error instanceof Error ? error : new Error('XML setup validation failed'), nodes: [] };
        }
    }, [ast]);
    const initializedAst = useRef<ASTNode | null>(null);
    const [setupFailure, setSetupFailure] = useState<{ ast: ASTNode; error: unknown } | null>(null);
    const [, setRenderVersion] = useState(0);
    const setupError = setupFailure?.ast === ast ? setupFailure.error : null;

    useEffect(() => {
        // Do not initialize an invalid document.
        if (setup.error) {
            return;
        }

        let mounted = true;
        let unsubscribers: Array<() => void> = [];
        const controller = new AbortController();

        /** Removes every Valtio subscription owned by this renderer. */
        function unsubscribeAll() {
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }

            unsubscribers = [];
        }

        /** Subscribes the renderer to every Valtio-backed state in the current Solution View context. */
        function subscribeToStateValues() {
            // Ignore asynchronous continuations after this renderer releases ownership.
            if (!mounted) return;

            // Remove previous subscriptions before rebuilding them.
            unsubscribeAll();

            // Subscribe to reactive state values in the context.
            for (const value of Object.values(ctx.scope.bindings)) {
                // Skip non-reactive context values.
                if (!isValtioProxy(value)) continue;

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
        ctx.services.invalidate = async (id) => {
            // Ignore invalidations after this renderer releases ownership.
            if (!mounted) return;

            // Skip unknown invalidation targets.
            const setup = ctx.services.setups[id];
            if (setup) {
                delete ctx.scope.bindings[id];
                await setup();
            }

            // Do not subscribe or render when cleanup occurred during setup.
            if (!mounted) return;

            subscribeToStateValues();
            setRenderVersion((current) => current + 1);
        };

        void setupContext(setup.nodes, ctx, controller.signal)
            .then(() => {
                // Do not publish setup completion after cleanup.
                if (!mounted) return;

                subscribeToStateValues();
                initializedAst.current = ast;
                setRenderVersion((current) => current + 1);
            })
            .catch((error) => {
                // Report setup failures only while mounted.
                if (mounted) setSetupFailure({ ast, error });
            });

        return () => {
            mounted = false;
            controller.abort();

            // Remove state subscriptions on unmount.
            unsubscribeAll();
        };
    }, [ast, ctx, setup]);

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
        <XmlErrorBoundary ast={ast}>
            <XmlContext.Provider value={ctx}>
                <Stack gap={3}>{renderNode(ast.children, ctx.scope)}</Stack>
            </XmlContext.Provider>
        </XmlErrorBoundary>
    );
}

/** Finds and validates State and Query declarations in document order. */
function getSetupNodes(nodes: ASTNode[]): ASTNode[] {
    const setupNodes: ASTNode[] = [];
    const setupIds = new Set<string>();

    function walk(currentNodes: ASTNode[]): void {
        // Validate setup declarations before checking descendants.
        for (const node of currentNodes) {
            // Collect setup declarations outside loop-local scope.
            if (node.name === 'State' || node.name === 'Query') {
                const id = validateSetupNode(node);
                if (setupIds.has(id)) {
                    throw new Error(`Duplicate State or Query id "${id}"`);
                }

                setupIds.add(id);
                setupNodes.push(node);
                continue;
            }

            // Skip nested loop content because it has its own scope.
            if (node.name === 'For') continue;

            walk(node.children);
        }
    }

    walk(nodes);
    return setupNodes;
}

/** Validates a single setup-only runtime declaration. */
function validateSetupNode(node: ASTNode): string {
    // Setup declarations require a static safe key.
    const idAttribute = node.params.id;
    if (!idAttribute) throw new Error(`${node.name} requires a string id`);

    if (idAttribute.kind !== 'text') throw new Error(`${node.name} id must be literal text`);

    const id = idAttribute.value.trim();
    if (!id || !isSafePropertyName(id)) {
        throw new Error(`${node.name} id must be a safe property name`);
    }
    if (id === 'params') throw new Error(`${node.name} id params is reserved`);

    // Validate state declarations.
    if (node.name === 'State') {
        const unsafeAttributes = Object.keys(node.params).filter((name) => name !== 'id' && !isSafePropertyName(name));

        // Reject unsafe state attribute names.
        if (unsafeAttributes.length) {
            throw new Error(`State attributes must be safe property names: ${unsafeAttributes.join(', ')}`);
        }

        // Keep State declarations leaf-only.
        if (node.children.length > 0) throw new Error('State cannot have children');

        return id;
    }

    // Validate query declarations.
    // Require a query source path.
    if (!node.params.path) throw new Error('Query requires a string path');

    // Keep Query declarations leaf-only.
    if (node.children.length > 0) throw new Error('Query cannot have children');

    return id;
}

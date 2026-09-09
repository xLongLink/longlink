import { subscribe } from 'valtio';
import { renderNode } from './core/node';
import { useApiError } from '@/lib/errors';
import { isValtioProxy } from './core/state';
import { Stack } from '@astryxdesign/core/Stack';
import type { ASTNode, XmlRuntime } from './types';
import { Banner } from '@astryxdesign/core/Banner';
import { getSetupNodes, setupContext, XmlContext } from './core/context';
import { Component, type ReactNode, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

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
    const reportError = useApiError();
    const reportSetupError = useEffectEvent(reportError);
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
            reportSetupError(setup.error);
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

        /** Subscribes the renderer to every Valtio-backed state in the current View context. */
        function subscribeToStateValues() {
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
            .catch((error: unknown) => {
                // Report setup failures only while mounted.
                if (!mounted) return;

                setSetupFailure({ ast, error });
                reportSetupError(error);
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
        return <Banner status="error" title="Unable to initialize this view" />;
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

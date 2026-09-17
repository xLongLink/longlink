import { useSnapshot } from 'valtio';
import { renderNode } from './core/node';
import { useApiError } from '@/lib/errors';
import { Stack } from '@astryxdesign/core/Stack';
import type { ASTNode, XmlRuntime } from './types';
import { Banner } from '@astryxdesign/core/Banner';
import { getSetupNodes, setupContext, XmlContext } from './core/context';
import { Component, type ReactNode, useEffect, useEffectEvent, useMemo, useState } from 'react';

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

/** Resets the mutable state owned by an XML runtime before its setup declarations run. */
function resetRuntime(runtime: XmlRuntime, invalidate: (id: string) => Promise<void>) {
    runtime.services.setups = {};
    for (const id of Object.keys(runtime.scope.bindings)) {
        if (id !== 'params') delete runtime.scope.bindings[id];
    }
    runtime.services.invalidate = invalidate;
}

/** Returns one setup declaration so it can repopulate its runtime binding. */
function takeRuntimeSetup(runtime: XmlRuntime, id: string) {
    if (!Object.hasOwn(runtime.services.setups, id)) return undefined;

    return runtime.services.setups[id];
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
    const [initializedAst, setInitializedAst] = useState<ASTNode | null>(null);
    const [setupFailure, setSetupFailure] = useState<{ ast: ASTNode; error: unknown } | null>(null);
    const setupError = setupFailure?.ast === ast ? setupFailure.error : null;
    useSnapshot(ctx.scope.bindings);

    useEffect(() => {
        // Do not initialize an invalid document.
        if (setup.error) {
            reportSetupError(setup.error);
            return;
        }

        let mounted = true;
        const controller = new AbortController();

        /* Attach the renderer-owned invalidation hook before async setup runs. */
        resetRuntime(ctx, async (id) => {
            // Ignore invalidations after this renderer releases ownership.
            if (!mounted) return;

            // Keep stale data visible while the refresh runs; restore it if the refresh fails.
            const previous = ctx.scope.bindings[id];

            // Skip unknown invalidation targets.
            const setup = takeRuntimeSetup(ctx, id);
            if (setup) {
                try {
                    await setup();
                } catch (error: unknown) {
                    if (!mounted) return;
                    ctx.scope.bindings[id] = previous;
                    reportSetupError(error instanceof Error ? error : new Error('XML refresh failed'));
                    return;
                }
            }

            // Do not publish changes when cleanup occurred during setup.
            if (!mounted) return;
        });

        void setupContext(setup.nodes, ctx, controller.signal)
            .then(() => {
                // Do not publish setup completion after cleanup.
                if (!mounted) return;

                setInitializedAst(ast);
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
        };
    }, [ast, ctx, setup]);

    // Show setup failures before rendering XML nodes.
    if (setup.error || setupError) {
        return <Banner status="error" title="Unable to initialize this view" />;
    }

    // Wait for setup before rendering dependent nodes.
    if (setup.nodes.length && initializedAst !== ast) return null;

    return (
        <XmlErrorBoundary ast={ast}>
            <XmlContext.Provider value={ctx}>
                <Stack gap={3}>{renderNode(ast.children, ctx.scope)}</Stack>
            </XmlContext.Provider>
        </XmlErrorBoundary>
    );
}

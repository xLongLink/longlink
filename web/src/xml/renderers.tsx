import { fetchApiJson } from '@/lib/api';
import { useEffect, useState, type ReactNode } from 'react';
import { getVersion, subscribe } from 'valtio';
import { ContextProvider, createContext, setupContext, validateSetupNodes } from './core/context';
import { XmlErrorBoundary } from './core/errors';
import { renderNode } from './core/node';
import { BaseUrlContext, resolveUrl } from './core/url';
import type { ASTNode, ExecutionContext } from './types';

type RenderXMLProps = {
    ast: ASTNode[];
    active?: boolean;
    ctx?: ExecutionContext;
    baseUrl?: string;
    locale?: string;
};

/**
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function RenderXML({ ast, active = true, ctx, baseUrl = '', locale }: RenderXMLProps): ReactNode {
    const [runtimeCtx] = useState<ExecutionContext>(() => ctx ?? createContext());
    const runtimeLocale = locale ?? ctx?.locale ?? runtimeCtx.locale ?? 'en';
    const requiresSetup = hasSetupNodes(ast);
    const requiresTranslations = hasTranslationNodes(ast);
    const waitsForTranslations = typeof document !== 'undefined' && requiresTranslations;
    const [initializedAst, setInitializedAst] = useState<ASTNode[] | null>(() => (requiresSetup ? null : ast));
    const [setupError, setSetupError] = useState<unknown>(null);
    const [version, setVersion] = useState(0);

    // Reset translations when the active locale changes.
    if (runtimeCtx.locale !== undefined && runtimeCtx.locale !== runtimeLocale) {
        runtimeCtx.translations = undefined;
    }

    runtimeCtx.hashNavigation = active;
    runtimeCtx.locale = runtimeLocale;

    let setupValidationError: Error | null = null;

    // Validate setup nodes before effects run.
    try {
        validateSetupNodes(ast);
    } catch (error: unknown) {
        setupValidationError = error instanceof Error ? error : new Error('XML setup validation failed');
    }

    useEffect(() => {
        let mounted = true;
        let unsubscribers: Array<() => void> = [];

        /** Subscribes the renderer to every Valtio-backed state slot in the current page context. */
        function subscribeToStateValues() {
            // Remove previous subscriptions before rebuilding them.
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }

            unsubscribers = [];

            // Subscribe to reactive state values in the context.
            for (const value of Object.values(runtimeCtx.values)) {
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

        runtimeCtx.setups = {};
        runtimeCtx.values = {};
        setSetupError(null);

        // Hydrate translations from the SDK route before localized nodes render.
        if (waitsForTranslations && runtimeCtx.translations === undefined) {
            const locale = runtimeCtx.locale ?? 'en';

            void fetchApiJson<Record<string, unknown>>(resolveUrl(baseUrl, `/i18n/${locale}.json`), {
                cache: 'no-cache',
            })
                .catch((error: unknown) => {
                    // Let missing English catalogs fail visibly.
                    if (locale === 'en') {
                        throw error;
                    }

                    // Keep localized apps usable when a selected account language has no catalog yet.
                    return fetchApiJson<Record<string, unknown>>(resolveUrl(baseUrl, '/i18n/en.json'), {
                        cache: 'no-cache',
                    });
                })
                .then((translations) => {
                    // Ignore translations after cleanup.
                    if (!mounted) return;

                    runtimeCtx.translations = translations;
                    setVersion((current) => current + 1);
                })
                .catch((error: unknown) => {
                    // Ignore translation errors after cleanup.
                    if (!mounted) return;

                    setSetupError(error instanceof Error ? error : new Error('Failed to load XML translations'));
                });
        }

        /* Attach the renderer-owned invalidation hook before async setup runs. */
        runtimeCtx.invalidate = async (ids) => {
            const list = Array.isArray(ids) ? ids : [ids];

            // Refresh each requested setup value.
            for (const id of list) {
                // Skip unknown invalidation targets.
                const setup = runtimeCtx.setups[id];
                if (!setup) continue;

                delete runtimeCtx.values[id];
                await setup();
            }

            subscribeToStateValues();
            setVersion((current) => current + 1);
        };

        (async () => {
            await setupContext(ast, runtimeCtx, baseUrl);
            subscribeToStateValues();

            // Publish initialized AST only while mounted.
            if (mounted) {
                setInitializedAst(ast);
                setVersion((current) => current + 1);
            }
        })().catch((error) => {
            // Report setup failures only while mounted.
            if (mounted) setSetupError(error);
        });

        return () => {
            mounted = false;

            // Remove state subscriptions on unmount.
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }
        };
    }, [ast, runtimeCtx, baseUrl, waitsForTranslations, runtimeLocale]);

    // Show setup failures before rendering XML nodes.
    if (setupValidationError || setupError) {
        const visibleError = setupValidationError ?? setupError;

        return (
            <XmlErrorBoundary resetKey={`${version}`}>
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    {visibleError instanceof Error ? visibleError.message : 'XML setup failed'}
                </div>
            </XmlErrorBoundary>
        );
    }

    // Wait for setup before rendering dependent nodes.
    if (requiresSetup && initializedAst !== ast) return null;

    // Wait for translations before localized nodes render.
    if (waitsForTranslations && runtimeCtx.translations === undefined) return null;

    return (
        <XmlErrorBoundary resetKey={`${version}`}>
            <BaseUrlContext.Provider value={baseUrl}>
                <ContextProvider value={runtimeCtx}>{renderNode(ast, runtimeCtx)}</ContextProvider>
            </BaseUrlContext.Provider>
        </XmlErrorBoundary>
    );
}

/** Returns whether the AST contains localized copy. */
function hasTranslationNodes(nodes: ASTNode[]): boolean {
    // Walk the tree until localized copy is found.
    for (const node of nodes) {
        // Detect localized attributes on this node.
        if (node.params?.i18n) return true;

        // Search nested nodes for localized copy.
        if (hasTranslationNodes(node.children ?? [])) return true;
    }

    return false;
}

/** Returns whether the AST contains setup-only runtime declarations. */
function hasSetupNodes(nodes: ASTNode[]): boolean {
    // Walk the tree until setup nodes are found.
    for (const node of nodes) {
        // Detect state and query setup declarations.
        if (node.name === 'State' || node.name === 'Query') return true;

        // Search nested nodes for setup declarations.
        if (hasSetupNodes(node.children ?? [])) return true;
    }

    return false;
}

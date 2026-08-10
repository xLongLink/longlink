import { Banner } from '@astryxdesign/core/Banner';
import { InternationalizationProvider, useTranslator, type MessagesByLocale } from '@astryxdesign/core/i18n';
import { useEffect, useState, type ReactNode } from 'react';
import { getVersion, subscribe } from 'valtio';
import { fetchApiJson } from '@/lib/api';
import { translationCatalogs } from '@/lib/i18n';
import { createContext, setupContext, validateSetupNodes, XmlContext } from './core/context';
import { XmlErrorBoundary } from './core/errors';
import { validateTranslationCatalog } from './core/i18n';
import { renderNode } from './core/node';
import { BaseUrlContext, resolveUrl } from './core/url';
import type { ASTNode, ExecutionContext } from './types';

type RenderXMLProps = {
    ast: ASTNode[];
    ctx?: ExecutionContext;
    baseUrl?: string;
};

type SetupFailure = {
    ast: ASTNode[];
    baseUrl: string;
    error: unknown;
};

/**
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function RenderXML({ ast, ctx, baseUrl = '' }: RenderXMLProps): ReactNode {
    const [runtimeCtx] = useState<ExecutionContext>(() => ctx ?? createContext());
    const requiresSetup = hasMatchingNode(ast, (node) => node.name === 'State' || node.name === 'Query');
    const requiresTranslations = hasMatchingNode(ast, (node) => Boolean(node.params?.i18n));
    const waitsForTranslations = typeof document !== 'undefined' && requiresTranslations;
    const [initializedAst, setInitializedAst] = useState<ASTNode[] | null>(() => (requiresSetup ? null : ast));
    const [setupFailure, setSetupFailure] = useState<SetupFailure | null>(null);
    const [version, setVersion] = useState(0);
    const setupError = setupFailure?.ast === ast && setupFailure.baseUrl === baseUrl ? setupFailure.error : null;

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

        // Hydrate translations from the SDK route before localized nodes render.
        if (waitsForTranslations && runtimeCtx.translations === undefined) {
            void fetchApiJson<unknown>(resolveUrl(baseUrl, '/i18n/en.json'), {
                cache: 'no-cache',
            })
                .then((translations) => {
                    // Ignore translations after cleanup.
                    if (!mounted) return;

                    runtimeCtx.translations = validateTranslationCatalog(translations);
                    setVersion((current) => current + 1);
                })
                .catch((error: unknown) => {
                    // Ignore translation errors after cleanup.
                    if (!mounted) return;

                    setSetupFailure({
                        ast,
                        baseUrl,
                        error: error instanceof Error ? error : new Error('Failed to load XML translations'),
                    });
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
    }, [ast, runtimeCtx, baseUrl, waitsForTranslations]);

    // Show setup failures before rendering XML nodes.
    if (setupValidationError || setupError) {
        const visibleError = setupValidationError ?? setupError;

        return (
            <Banner status="error" title={visibleError instanceof Error ? visibleError.message : 'XML setup failed'} />
        );
    }

    // Wait for setup before rendering dependent nodes.
    if (requiresSetup && initializedAst !== ast) return null;

    // Wait for translations before localized nodes render.
    if (waitsForTranslations && runtimeCtx.translations === undefined) return null;

    const messages: MessagesByLocale = {
        ...translationCatalogs,
        en: {
            ...translationCatalogs.en,
            ...runtimeCtx.translations,
        },
    };

    return (
        <XmlErrorBoundary resetKey={version}>
            <InternationalizationProvider locale="en" messages={messages}>
                <XmlContent ast={ast} baseUrl={baseUrl} ctx={runtimeCtx} />
            </InternationalizationProvider>
        </XmlErrorBoundary>
    );
}

/** Installs the active Astryx translator into the mutable XML execution scope. */
function XmlContent({ ast, baseUrl, ctx }: { ast: ASTNode[]; baseUrl: string; ctx: ExecutionContext }) {
    ctx.translate = useTranslator();

    return (
        <BaseUrlContext.Provider value={baseUrl}>
            <XmlContext.Provider value={ctx}>{renderNode(ast, ctx)}</XmlContext.Provider>
        </BaseUrlContext.Provider>
    );
}

/** Returns whether the AST contains a node matching the supplied predicate. */
function hasMatchingNode(nodes: ASTNode[], predicate: (node: ASTNode) => boolean): boolean {
    // Walk the tree until a matching node is found.
    for (const node of nodes) {
        // Check this node before visiting descendants.
        if (predicate(node)) return true;

        // Search nested nodes for a match.
        if (hasMatchingNode(node.children ?? [], predicate)) return true;
    }

    return false;
}

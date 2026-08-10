import { Banner } from '@astryxdesign/core/Banner';
import { InternationalizationProvider, useTranslator, type MessagesByLocale } from '@astryxdesign/core/i18n';
import { useEffect, useState, type ReactNode } from 'react';
import { getVersion, subscribe } from 'valtio';
import { fetchApiJson } from '@/lib/api';
import { translationCatalogs } from '@/lib/i18n';
import { ContextProvider, createContext, setupContext, validateSetupNodes } from './core/context';
import { XmlErrorBoundary } from './core/errors';
import { validateTranslationCatalog } from './core/i18n';
import { renderNode } from './core/node';
import { BaseUrlContext, resolveUrl } from './core/url';
import type { ASTNode, ExecutionContext } from './types';

type RenderXMLProps = {
    ast: ASTNode[];
    active?: boolean;
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
export function RenderXML({ ast, active = true, ctx, baseUrl = '' }: RenderXMLProps): ReactNode {
    const [runtimeCtx] = useState<ExecutionContext>(() => ctx ?? createContext());
    const requiresSetup = hasSetupNodes(ast);
    const requiresTranslations = hasTranslationNodes(ast);
    const waitsForTranslations = typeof document !== 'undefined' && requiresTranslations;
    const [initializedAst, setInitializedAst] = useState<ASTNode[] | null>(() => (requiresSetup ? null : ast));
    const [setupFailure, setSetupFailure] = useState<SetupFailure | null>(null);
    const [version, setVersion] = useState(0);
    const setupError = setupFailure?.ast === ast && setupFailure.baseUrl === baseUrl ? setupFailure.error : null;

    runtimeCtx.hashNavigation = active;

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
            if (mounted) setSetupFailure({ ast, baseUrl, error });
        });

        return () => {
            mounted = false;

            // Remove state subscriptions on unmount.
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }
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
            <ContextProvider value={ctx}>{renderNode(ast, ctx)}</ContextProvider>
        </BaseUrlContext.Provider>
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

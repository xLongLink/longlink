import { Banner } from '@astryxdesign/core-0-3/Banner';
import { InternationalizationProvider, useTranslator, type MessagesByLocale } from '@astryxdesign/core-0-3/i18n';
import { Stack } from '@astryxdesign/core-0-3/Stack';
import { useEffect, useState } from 'react';
import { getVersion, subscribe } from 'valtio';
import { fetchApiJson } from '@/lib/api';
import { translationCatalogs } from '@/lib/i18n';
import { createContext, setupContext, validateSetupNodes, XmlContext } from './core/context';
import { XmlErrorBoundary } from './core/errors';
import { validateTranslationCatalog } from './core/i18n';
import { renderNode } from './core/node';
import { resolveUrl } from './core/url';
import type { ASTNode, XmlRuntime } from './types';

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
    const { requiresSetup, requiresTranslations } = getRequirements(ast);
    const waitsForTranslations = typeof document !== 'undefined' && requiresTranslations;
    const [initializedAst, setInitializedAst] = useState<ASTNode[] | null>(() => (requiresSetup ? null : ast));
    const [setupFailure, setSetupFailure] = useState<{ ast: ASTNode[]; baseUrl: string; error: unknown } | null>(null);
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

        // Hydrate translations from the SDK route before localized nodes render.
        if (waitsForTranslations && runtimeCtx.services.translations === undefined) {
            void fetchApiJson<unknown>(resolveUrl(baseUrl, '/i18n/en.json'), {
                cache: 'no-cache',
            })
                .then((translations) => {
                    // Ignore translations after cleanup.
                    if (!mounted) return;

                    runtimeCtx.services.translations = validateTranslationCatalog(translations);
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
    if (waitsForTranslations && runtimeCtx.services.translations === undefined) return null;

    const messages: MessagesByLocale = {
        ...translationCatalogs,
        en: {
            ...translationCatalogs.en,
            ...runtimeCtx.services.translations,
        },
    };

    return (
        <XmlErrorBoundary resetKey={version}>
            <InternationalizationProvider locale="en" messages={messages}>
                <XmlContent ast={ast} ctx={runtimeCtx} />
            </InternationalizationProvider>
        </XmlErrorBoundary>
    );
}

/** Installs the active Astryx translator into renderer-owned XML services. */
function XmlContent({ ast, ctx }: { ast: ASTNode[]; ctx: XmlRuntime }) {
    ctx.services.translate = useTranslator();
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

/** Returns setup and translation requirements discovered in one AST traversal. */
function getRequirements(nodes: ASTNode[]): { requiresSetup: boolean; requiresTranslations: boolean } {
    let requiresSetup = false;
    let requiresTranslations = false;

    // Walk the tree until both requirements are known.
    for (const node of nodes) {
        requiresSetup ||= node.name === 'State' || node.name === 'Query';
        requiresTranslations ||= node.params.i18n != null;
        if (requiresSetup && requiresTranslations) break;

        const nested = getRequirements(node.children);
        requiresSetup ||= nested.requiresSetup;
        requiresTranslations ||= nested.requiresTranslations;
        if (requiresSetup && requiresTranslations) break;
    }

    return { requiresSetup, requiresTranslations };
}

import { createContext as createReactContext, useContext as useReactContext } from 'react';
import { proxy } from 'valtio';
import { fetchApiJson } from '@/lib/api';
import { evaluate, isSafePropertyName, isText } from '../expressions';
import type { ASTNode, RuntimeServices, Scope, XmlRuntime } from '../types';
import { resolveRequestUrl } from './url';

export const XmlContext = createReactContext<XmlRuntime | null>(null);

/** Creates a blank XML runtime context. */
export function createContext(): XmlRuntime {
    const params = {};

    return {
        scope: { bindings: { params } },
        services: {
            invalidate: async () => {},
            navigationBaseUrl: '',
            params,
            requestBaseUrl: '',
            setups: {},
        },
    };
}

/** Returns the active XML runtime from the XML context. */
export function useXmlRuntime(): XmlRuntime {
    // Fail fast when XML runtime state is unavailable.
    const runtime = useReactContext(XmlContext);
    if (!runtime) {
        throw new Error('useXmlContext must be used inside a rendered XML component');
    }

    return runtime;
}

/** Returns the active XML lexical scope. */
export function useXmlContext(): Scope {
    return useXmlRuntime().scope;
}

/** Returns the renderer and host services for the active XML runtime. */
export function useXmlServices(): RuntimeServices {
    return useXmlRuntime().services;
}

/** Resolves top-level State and Query nodes before rendering the page tree. */
export async function setupContext(ast: ASTNode[], runtime: XmlRuntime, baseUrl: string): Promise<void> {
    const { scope, services } = runtime;

    async function walk(nodes: ASTNode[]): Promise<void> {
        // Visit setup declarations in document order.
        for (const node of nodes) {
            // If we reach a "For" component, we stop the walk since the content of "For" has a different context.
            if (node.name === 'For') continue;

            // Seed state and queries before rendering the component tree.
            if (node.name === 'State') {
                const params = node.params!;
                const id = params.id.kind === 'text' ? params.id.value.trim() : '';
                const entries = Object.entries(params).filter(([key]) => key !== 'id');

                // Preserve local state across renderer refreshes; invalidation deletes the slot before setup runs.
                services.setups[id] = () => {
                    // Only seed state that is not already present.
                    if (!(id in scope.bindings)) {
                        // Seed a proxied object from all attributes except `id`.
                        const initialValue: Record<string, unknown> = {};

                        // Copy declared attributes into the initial state object.
                        for (const [key, attribute] of entries) {
                            const input = attribute.kind === 'text' ? attribute.value.trim() : null;

                            // Preserve empty literal attributes.
                            if (input === '') {
                                initialValue[key] = '';
                                continue;
                            }

                            // Prefer JSON literals before evaluating expressions.
                            try {
                                initialValue[key] = JSON.parse(input ?? '');
                                continue;
                            } catch {
                                initialValue[key] = evaluate(attribute, scope);
                            }
                        }

                        // Keep state values reactive for bound XML controls.
                        if (!isSafePropertyName(id)) {
                            throw new Error('State id must be a safe property name');
                        }

                        scope.bindings[id] = proxy(initialValue);
                    }
                };
                await services.setups[id]();
            }

            // Seed query data before rendering the component tree.
            if (node.name === 'Query') {
                const params = node.params!;
                const id = params.id.kind === 'text' ? params.id.value.trim() : '';
                const pathAttribute = params.path;

                // We store the setup function so that in case of invalidation it can be re-run to refetch the data.
                services.setups[id] = async () => {
                    const path = evaluate(pathAttribute, scope);

                    // Query paths may interpolate route params, but must still resolve to a URL string.
                    if (path == null || typeof path === 'object' || typeof path === 'function') {
                        throw new Error('Query path must resolve to a string');
                    }

                    const url = resolveRequestUrl(baseUrl, String(path));

                    scope.bindings[id] = await fetchApiJson<unknown>(url);
                };
                await services.setups[id]();
            }

            await walk(node.children ?? []);
        }
    }

    await walk(ast);
}

/** Validates setup-only runtime declarations before they are initialized. */
export function validateSetupNodes(nodes: ASTNode[]): void {
    // Validate each declaration before checking descendants.
    for (const node of nodes) {
        validateSetupNode(node);

        // Skip nested loop content because it has its own scope.
        if (node.name !== 'For') {
            validateSetupNodes(node.children ?? []);
        }
    }
}

/** Validates a single setup-only runtime declaration. */
function validateSetupNode(node: ASTNode): void {
    // LongLink roots accept optional metadata-only attributes.
    if (node.name === 'longlink') {
        const params = node.params ?? {};
        const unsupported = Object.keys(params).filter(
            (name) => name !== 'name' && name !== 'icon' && name !== 'version'
        );

        // Reject unknown root metadata.
        if (unsupported.length) {
            throw new Error(`Unsupported longlink attributes: ${unsupported.join(', ')}`);
        }
    }

    // Validate state declarations.
    if (node.name === 'State') {
        // Require a declared state key.
        if (!node.params?.id) throw new Error('State requires a string id');

        // Keep state keys static.
        if (!isText(node.params.id)) throw new Error('State id must be literal text');

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
        if ((node.children ?? []).length > 0) throw new Error('State cannot have children');
    }

    // Validate query declarations.
    if (node.name === 'Query') {
        // Require a declared query key.
        if (!node.params?.id) throw new Error('Query requires a string id');

        // Require a query source path.
        if (!node.params?.path) throw new Error('Query requires a string path');

        // Keep Query declarations leaf-only.
        if ((node.children ?? []).length > 0) throw new Error('Query cannot have children');

        // Keep query keys static.
        if (!isText(node.params.id)) throw new Error('Query id must be literal text');

        // Prevent unsafe query property names.
        if (!node.params.id.value.trim() || !isSafePropertyName(node.params.id.value.trim())) {
            throw new Error('Query id must be a safe property name');
        }
    }
}

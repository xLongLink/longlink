import { proxy } from 'valtio';
import { createContext as createReactContext, useContext as useReactContext } from 'react';
import { fetchApiJson } from '@/lib/api';
import type { ASTNode, XmlRuntime } from '../types';
import { resolveRequestUrl } from './url';
import { evaluate } from '../expressions';

export const XmlContext = createReactContext<XmlRuntime | null>(null);

/** Creates a blank XML runtime context. */
export function createContext(): XmlRuntime {
    return {
        scope: { bindings: { params: {} } },
        services: {
            invalidate: async () => {},
            navigationBaseUrl: '',
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
        throw new Error('useXmlRuntime must be used inside a rendered XML component');
    }

    return runtime;
}

/** Resolves validated State and Query nodes before rendering the page tree. */
export async function setupContext(nodes: ASTNode[], runtime: XmlRuntime, baseUrl: string): Promise<void> {
    const { scope, services } = runtime;

    // Seed setup declarations before rendering the component tree.
    for (const node of nodes) {
        if (node.name === 'State') {
            const params = node.params;
            const id = params.id?.kind === 'text' ? params.id.value.trim() : '';
            const entries = Object.entries(params).filter(([key]) => key !== 'id');

            // Preserve local state across renderer refreshes; invalidation deletes the slot before setup runs.
            services.setups[id] = () => {
                // Only seed state that is not already present.
                if (!(id in scope.bindings)) {
                    // Seed a proxied object from all attributes except `id`.
                    const initialValue: Record<string, unknown> = {};

                    // Copy declared attributes into the initial state object.
                    for (const [key, attribute] of entries) {
                        initialValue[key] = evaluate(attribute, scope);
                    }

                    scope.bindings[id] = proxy(initialValue);
                }
            };
            services.setups[id]();
        }

        if (node.name === 'Query') {
            const params = node.params;
            const id = params.id?.kind === 'text' ? params.id.value.trim() : '';
            const pathAttribute = params.path;

            // We store the setup function so that in case of invalidation it can be re-run to refetch the data.
            services.setups[id] = async () => {
                const path = evaluate(pathAttribute, scope);

                // Query paths may interpolate route params, but must still resolve to a URL string.
                if (path == null || typeof path === 'object' || typeof path === 'function') {
                    throw new Error('Query path must resolve to a string');
                }

                const url = resolveRequestUrl(baseUrl, String(path));

                scope.bindings[id] = await fetchApiJson(url);
            };
            await services.setups[id]();
        }
    }
}

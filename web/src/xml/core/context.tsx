import { proxy } from 'valtio';
import { api } from '@/lib/api';
import { evaluate } from '../expressions';
import { resolveRequestUrl } from './url';
import type { ASTNode, XmlRuntime } from '../types';
import { createContext as createReactContext, useContext as useReactContext } from 'react';

export const XmlContext = createReactContext<XmlRuntime | null>(null);

/** Creates a blank XML runtime context. */
export function createContext(params: Record<string, string> = {}): XmlRuntime {
    return {
        scope: { bindings: { params } },
        services: {
            invalidate: async () => {},
            navigate: () => {},
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
export async function setupContext(nodes: ASTNode[], runtime: XmlRuntime): Promise<void> {
    const { scope, services } = runtime;

    // Seed setup declarations before rendering the component tree.
    for (const node of nodes) {
        const params = node.params;
        const id = params.id?.kind === 'text' ? params.id.value.trim() : '';

        if (node.name === 'State') {
            // Preserve local state across renderer refreshes; invalidation deletes it before setup runs.
            services.setups[id] = () => {
                // Only seed state that is not already present.
                if (!(id in scope.bindings)) {
                    // Seed a proxied object from all attributes except `id`.
                    const initialValue: Record<string, unknown> = {};

                    // Copy declared attributes into the initial state object.
                    for (const [key, attribute] of Object.entries(params)) {
                        if (key === 'id') continue;

                        initialValue[key] = evaluate(attribute, scope);
                    }

                    scope.bindings[id] = proxy(initialValue);
                }
            };
            services.setups[id]();
        } else {
            const pathAttribute = params.path;

            // We store the setup function so that in case of invalidation it can be re-run to refetch the data.
            services.setups[id] = async () => {
                const path = evaluate(pathAttribute, scope);

                // Query paths may interpolate route params, but must still resolve to a URL string.
                if (path == null || typeof path === 'object' || typeof path === 'function') {
                    throw new Error('Query path must resolve to a string');
                }

                const url = resolveRequestUrl(services.requestBaseUrl, String(path));

                scope.bindings[id] = await api(url).json();
            };
            await services.setups[id]();
        }
    }
}

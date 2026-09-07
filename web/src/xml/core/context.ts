import * as React from 'react';
import { proxy } from 'valtio';
import { api } from '@/lib/api';
import { resolveRequestUrl } from './url';
import { evaluate } from '../expressions/evaluate';
import { isSafePropertyName } from '../expressions/resolve';
import type { ASTAttribute, ASTNode, ASTProps, XmlRuntime } from '../types';

type SetupDeclaration =
    | { name: 'State'; id: string; params: ASTProps }
    | { name: 'Query'; id: string; path: ASTAttribute };

export const XmlContext = React.createContext<XmlRuntime | null>(null);

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
    const runtime = React.useContext(XmlContext);
    if (!runtime) {
        throw new Error('useXmlRuntime must be used inside a rendered XML component');
    }

    return runtime;
}

/** Finds and validates State and Query declarations in document order. */
export function getSetupNodes(nodes: ASTNode[]): SetupDeclaration[] {
    const setupNodes: SetupDeclaration[] = [];
    const setupIds = new Set<string>();

    function walk(currentNodes: ASTNode[]): void {
        // Validate setup declarations before checking descendants.
        for (const node of currentNodes) {
            // Collect setup declarations outside loop-local scope.
            if (node.name === 'State' || node.name === 'Query') {
                const declaration = validateSetupNode(node);
                if (setupIds.has(declaration.id)) {
                    throw new Error(`Duplicate State or Query id "${declaration.id}"`);
                }

                setupIds.add(declaration.id);
                setupNodes.push(declaration);
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
function validateSetupNode(node: ASTNode): SetupDeclaration {
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
        const unsafeAttributes = Object.keys(node.params).filter((name) => !isSafePropertyName(name));

        // Reject unsafe state attribute names.
        if (unsafeAttributes.length) {
            throw new Error(`State attributes must be safe property names: ${unsafeAttributes.join(', ')}`);
        }

        // Keep State declarations leaf-only.
        if (node.children.length > 0) throw new Error('State cannot have children');

        return { name: 'State', id, params: node.params };
    }

    // Require a query source path.
    if (!node.params.path) throw new Error('Query requires a string path');

    // Keep Query declarations leaf-only.
    if (node.children.length > 0) throw new Error('Query cannot have children');

    return { name: 'Query', id, path: node.params.path };
}

/** Resolves validated State and Query declarations before rendering the View tree. */
export async function setupContext(
    nodes: SetupDeclaration[],
    runtime: XmlRuntime,
    signal?: AbortSignal
): Promise<void> {
    const { scope, services } = runtime;

    // Seed setup declarations before rendering the component tree.
    for (const node of nodes) {
        const { id } = node;

        if (node.name === 'State') {
            const setup = () => {
                // Seed a proxied object from all attributes except `id`.
                const initialValue: Record<string, unknown> = {};

                // Copy declared attributes into the initial state object.
                for (const [key, attribute] of Object.entries(node.params)) {
                    if (key === 'id') continue;

                    initialValue[key] = evaluate(attribute, scope);
                }

                scope.bindings[id] = proxy(initialValue);
            };
            services.setups[id] = setup;
            setup();
        } else {
            // We store the setup function so that in case of invalidation it can be re-run to refetch the data.
            const setup = async () => {
                const path = evaluate(node.path, scope);

                // Query paths may interpolate route params, but must still resolve to a URL string.
                if (path == null || typeof path === 'object' || typeof path === 'function') {
                    throw new Error('Query path must resolve to a string');
                }

                const url = resolveRequestUrl(services.requestBaseUrl, String(path));

                scope.bindings[id] = await api(url, { signal }).json();
            };
            services.setups[id] = setup;
            await setup();
        }
    }
}

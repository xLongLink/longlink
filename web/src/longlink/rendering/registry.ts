import type { ComponentType } from 'react';
import type { ComponentRegistry, RegistryEntry } from './types';

function toRegistryEntry(component: ComponentType<any> | RegistryEntry): RegistryEntry {
    if (typeof component === 'object' && component !== null && 'component' in component) {
        return component;
    }

    return {
        component,
        renderChildren: true,
    };
}

export function createRegistry(customComponents: Record<string, ComponentType<any> | RegistryEntry>) {
    return new Proxy(customComponents, {
        get(target, prop: string | symbol) {
            if (typeof prop !== 'string') {
                return undefined;
            }

            if (prop in target) {
                return toRegistryEntry(target[prop]);
            }

            return undefined;
        },
    }) as ComponentRegistry;
}

import { mapValues } from 'es-toolkit/object';
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

function normalizeRegistryKey(value: string) {
    return value
        .trim()
        .replace(/[\s_-]+/g, '')
        .toLowerCase();
}

export function createRegistry(customComponents: Record<string, ComponentType<any> | RegistryEntry>) {
    const registryEntries = mapValues(customComponents, toRegistryEntry);
    const normalizedEntries = new Map(
        Object.entries(registryEntries).map(([key, entry]) => [normalizeRegistryKey(key), entry])
    );

    return new Proxy(registryEntries, {
        get(target, prop: string | symbol) {
            if (typeof prop !== 'string') {
                return undefined;
            }

            if (prop in target) {
                return target[prop];
            }

            return normalizedEntries.get(normalizeRegistryKey(prop));
        },
    }) as ComponentRegistry;
}

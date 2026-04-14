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

export function createRegistry(customComponents: Record<string, ComponentType<any> | RegistryEntry>) {
    return mapValues(customComponents, toRegistryEntry) as ComponentRegistry;
}

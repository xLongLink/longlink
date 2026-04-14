import { Fragment } from 'react';
import type { ComponentRegistry } from './types';
import { FRAGMENT } from './utils';

const baseRegistry: ComponentRegistry = {
    [FRAGMENT]: Fragment,
};

/**
 * Creates a component registry that merges custom components with the built-in base registry.
 * Unknown component types fall back to returning the type string as a native HTML element name.
 */
export function createRegistry(customComponents: ComponentRegistry = {}): ComponentRegistry {
    return new Proxy(customComponents, {
        get(target, prop: string | symbol) {
            if (typeof prop !== 'string') {
                return undefined;
            }

            if (prop in target) {
                return Reflect.get(target, prop);
            }

            if (prop in baseRegistry) {
                return baseRegistry[prop];
            }

            return prop;
        },
    });
}

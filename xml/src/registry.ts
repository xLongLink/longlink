import { Fragment} from 'react';
import type { ComponentRegistry } from './types';
import { FRAGMENT } from './types';

const baseRegistry: ComponentRegistry = {
    [FRAGMENT]: Fragment,
};


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

import { createElement, type ComponentType } from 'react';
import { For } from '../primitives/For';
import { Page } from '../primitives/Page';
import { Query } from '../primitives/Query';
import { State } from '../primitives/State';
import type { PrimitiveComponent, PrimitiveProps, RegistryShape } from '../types';

function primitive<T extends ComponentType<PrimitiveProps>>(component: T): T & PrimitiveComponent {
    return Object.assign(component, { $$reactxmlPrimitive: true as const }) as T & PrimitiveComponent;
}

const defaultPrimitives = {
    Page: primitive(Page),
    Query: primitive(Query),
    State: primitive(State),
    For: primitive(For),
} satisfies RegistryShape;

export function createRegistry<const TRegistry extends RegistryShape>(
    registry: TRegistry
): typeof defaultPrimitives & TRegistry {
    return {
        ...defaultPrimitives,
        ...registry,
    };
}

if (import.meta.main) {
    function Page(props: React.HTMLAttributes<HTMLElement>) {
        return createElement('main', props);
    }

    function Section(props: React.HTMLAttributes<HTMLElement>) {
        return createElement('section', props);
    }

    const registry = createRegistry({
        Page,
        Section,
    });

    console.log(registry);
}

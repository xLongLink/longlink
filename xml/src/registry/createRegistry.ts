import { createElement } from 'react';
import { For } from '../primitives/For';
import { Grid } from '../primitives/Grid';
import { Page } from '../primitives/Page';
import { Query } from '../primitives/Query';
import { State } from '../primitives/State';
import type { RegistryShape } from '../types';

const defaultPrimitives = {
    Page,
    Query,
    State,
    For,
    Grid,
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

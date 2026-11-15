import { viewProps } from '../props';
import { createElement, type ElementType, type ReactNode } from 'react';

/** Filters props on public components without restricting native JSX or changing component identities. */
export function createViewElement(components: typeof import('../index')) {
    const exposed = new Set<unknown>(Object.values(components));

    // Apply the same policy to every component admitted through the public adapter exports.
    return (type: ElementType, props: Parameters<typeof createElement>[1], ...children: ReactNode[]) =>
        createElement(type, props && exposed.has(type) ? viewProps(props) : props, ...children);
}

import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Hr', () => {
    /* The compiler should preserve the Hr element without attributes. */
    it('compiles hr xml into a hr ast node', () => {
        expect(parseXML('<Hr />')).toEqual([{ name: 'Hr', children: [] }]);
    });

    /* The runtime should render Hr XML into the shadcn separator output. */
    it('renders raw xml hr content end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Hr />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div data-orientation="horizontal" role="separator" aria-orientation="horizontal" data-slot="separator" class="shrink-0 h-px w-full bg-border"></div>'
        );
    });
});

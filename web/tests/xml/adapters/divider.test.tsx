import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Divider', () => {
    /* The compiler should preserve the Divider element without attributes. */
    it('compiles divider xml into a divider ast node', () => {
        expect(parseXML('<Divider />')).toEqual([{ name: 'Divider', children: [] }]);
    });

    /* The runtime should render Divider XML into the shadcn separator output. */
    it('renders raw xml divider content end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Divider />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div data-orientation="horizontal" role="separator" aria-orientation="horizontal" data-slot="separator" class="shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch"></div>'
        );
    });
});

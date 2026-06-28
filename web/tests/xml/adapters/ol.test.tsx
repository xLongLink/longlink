import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Ol', () => {
    /* The compiler should preserve titlecase ordered list bridges. */
    it('compiles ol xml into an ordered list ast node', () => {
        expect(parseXML('<Ol><Li i18n="First item" /><Li i18n="Second item" /></Ol>')).toEqual([
            {
                name: 'Ol',
                children: [
                    { name: 'Li', params: { i18n: 'First item' }, children: [] },
                    { name: 'Li', params: { i18n: 'Second item' }, children: [] },
                ],
            },
        ]);
    });

    /* The runtime should render ordered list XML into the expected HTML output. */
    it('renders ordered list xml end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Ol><Li i18n="First item" /><Li i18n="Second item" /></Ol>');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<ol class="ml-6 list-decimal space-y-2"><li>First item</li><li>Second item</li></ol>'
        );
    });
});

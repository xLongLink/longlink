import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('ol', () => {
    /* The compiler should preserve ordered list bridges. */
    it('compiles ol xml into an ordered list ast node', () => {
        expect(parseXML('<ol><li>First item</li><li>Second item</li></ol>')).toEqual([
            {
                name: 'ol',
                children: [
                    { name: 'li', children: [{ name: 'Text', params: { value: 'First item' } }] },
                    { name: 'li', children: [{ name: 'Text', params: { value: 'Second item' } }] },
                ],
            },
        ]);
    });

    /* The runtime should render ordered list XML into the expected HTML output. */
    it('renders ordered list xml end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<ol><li>First item</li><li>Second item</li></ol>');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<ol class="my-6 ml-6 list-decimal [&amp;&gt;li]:mt-2"><li>First item</li><li>Second item</li></ol>'
        );
    });
});

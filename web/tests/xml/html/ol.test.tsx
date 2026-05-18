import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Ol', () => {
    /* The compiler should preserve titlecase ordered list bridges. */
    it('compiles ol xml into an ordered list ast node', () => {
        expect(parseXML('<Ol><Li>First item</Li><Li>Second item</Li></Ol>')).toEqual([
            {
                name: 'Ol',
                children: [
                    { name: 'Li', children: [{ name: 'Text', params: { value: 'First item' } }] },
                    { name: 'Li', children: [{ name: 'Text', params: { value: 'Second item' } }] },
                ],
            },
        ]);
    });

    /* The runtime should render ordered list XML into the expected HTML output. */
    it('renders ordered list xml end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Ol><Li>First item</Li><Li>Second item</Li></Ol>');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe('<ol><li>First item</li><li>Second item</li></ol>');
    });
});

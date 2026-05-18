import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('P', () => {
    /* The compiler should preserve paragraph text without HTML params. */
    it('compiles p xml into a paragraph ast node', () => {
        expect(parseXML('<P>Paragraph text</P>')).toEqual([
            {
                name: 'P',
                children: [{ name: 'Text', params: { value: 'Paragraph text' } }],
            },
        ]);
    });

    /* The runtime should render paragraph XML into the expected HTML output. */
    it('renders raw xml paragraph content end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<P>Paragraph text</P>');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<p class="leading-7 [&amp;:not(:first-child)]:mt-4">Paragraph text</p>'
        );
    });
});

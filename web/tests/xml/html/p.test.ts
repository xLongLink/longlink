import { parseXML } from '@/xml/parser';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('P', () => {
    /* The compiler should preserve paragraph text without HTML params. */
    it('compiles p xml into a paragraph ast node', () => {
        expect(parseXML('<p>Paragraph text</p>')).toEqual([
            {
                name: 'p',
                children: [{ name: 'Text', children: 'Paragraph text' }],
            },
        ]);
    });

    /* The runtime should render paragraph XML into the expected HTML output. */
    it('renders raw xml paragraph content end to end', () => {
        const ctx: ExecutionContext = {};
        const ast = parseXML('<p>Paragraph text</p>');
        const renderedTree = render(ast, ctx, '');

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<p class="leading-7 [&amp;:not(:first-child)]:mt-6">Paragraph text</p>'
        );
    });
});

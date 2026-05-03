import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('P', () => {
    /* The compiler should preserve paragraph text and attributes. */
    it('compiles p xml into a paragraph ast node', () => {
        expect(xmlToAST('<p data-kind="intro">Paragraph text</p>')).toEqual([
            {
                name: 'p',
                params: {
                    'data-kind': 'intro',
                },
                children: [{ name: 'text', value: 'Paragraph text' }],
            },
        ]);
    });

    /* The runtime should render paragraph XML into the expected HTML output. */
    it('renders raw xml paragraph content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<p>Paragraph text</p>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<p class="leading-7 [&amp;:not(:first-child)]:mt-6">Paragraph text</p>'
        );
    });
});

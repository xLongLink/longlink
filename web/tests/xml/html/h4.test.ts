import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('H4', () => {
    /* The compiler should preserve H4 text content and attributes. */
    it('compiles h4 xml into an h4 ast node', () => {
        expect(xmlToAST('<h4 aria-label="detail">Minor heading</h4>')).toEqual([
            {
                name: 'h4',
                params: {
                    'aria-label': 'detail',
                },
                children: [{ name: 'text', value: 'Minor heading' }],
            },
        ]);
    });

    /* The runtime should render h4 XML into the expected HTML output. */
    it('renders raw xml h4 content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<h4>Heading four</h4>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<h4 class="text-xl font-semibold tracking-tight [&amp;:not(:first-child)]:mt-8">Heading four</h4>'
        );
    });
});

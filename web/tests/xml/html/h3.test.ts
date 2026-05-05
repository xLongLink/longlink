import { xmlToAST } from '@/xml/compiler';
import { registry } from '@/xml/registry';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('H3', () => {
    /* The compiler should preserve H3 text content and attributes. */
    it('compiles h3 xml into an h3 ast node', () => {
        expect(xmlToAST('<h3 data-level="3">Subsection</h3>')).toEqual([
            {
                name: 'h3',
                params: {
                    'data-level': '3',
                },
                children: [{ name: 'text', value: 'Subsection' }],
            },
        ]);
    });

    /* The runtime should render h3 XML into the expected HTML output. */
    it('renders raw xml h3 content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<h3>Heading three</h3>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<h3 class="text-2xl font-semibold tracking-tight [&amp;:not(:first-child)]:mt-8">Heading three</h3>'
        );
    });
});

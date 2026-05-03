import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('H2', () => {
    /* The compiler should preserve H2 text content and attributes. */
    it('compiles h2 xml into an h2 ast node', () => {
        expect(xmlToAST('<h2 class="lead">Section</h2>')).toEqual([
            {
                name: 'h2',
                params: {
                    class: 'lead',
                },
                children: [{ name: 'text', value: 'Section' }],
            },
        ]);
    });

    /* The runtime should render h2 XML into the expected HTML output. */
    it('renders raw xml h2 content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<h2>Heading two</h2>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<h2 class="text-3xl font-semibold tracking-tight [&amp;:not(:first-child)]:mt-8">Heading two</h2>'
        );
    });
});

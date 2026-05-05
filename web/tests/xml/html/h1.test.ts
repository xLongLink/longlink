import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('H1', () => {
    /* The compiler should preserve H1 text content without HTML params. */
    it('compiles h1 xml into an h1 ast node', () => {
        expect(xmlToAST('<h1>Heading</h1>')).toEqual([
            {
                name: 'h1',
                children: [{ name: 'text', value: 'Heading' }],
            },
        ]);
    });

    /* The runtime should render h1 XML into the expected HTML output. */
    it('renders raw xml h1 content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<h1>Heading one</h1>');
        const renderedTree = render(ast, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<h1 class="text-4xl font-semibold tracking-tight [&amp;:not(:first-child)]:mt-8">Heading one</h1>'
        );
    });
});

import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Blockquote', () => {
    /* The compiler should preserve blockquote content without HTML params. */
    it('compiles blockquote xml into a blockquote ast node', () => {
        expect(xmlToAST('<blockquote>Quote</blockquote>')).toEqual([
            {
                name: 'blockquote',
                children: [{ name: 'text', value: 'Quote' }],
            },
        ]);
    });

    /* The runtime should render blockquote XML into the expected HTML output. */
    it('renders raw xml blockquote content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<blockquote>Quoted text</blockquote>');
        const renderedTree = render(ast, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<blockquote class="mt-6 border-l-2 pl-6 italic">Quoted text</blockquote>'
        );
    });
});

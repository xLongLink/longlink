import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Li', () => {
    /* The compiler should preserve list item text without HTML params. */
    it('compiles li xml into a list item ast node', () => {
        expect(xmlToAST('<li>Item</li>')).toEqual([
            {
                name: 'li',
                children: [{ name: 'text', value: 'Item' }],
            },
        ]);
    });

    /* The runtime should render list item XML into the expected HTML output. */
    it('renders raw xml list item content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<li>Item one</li>');
        const renderedTree = render(ast, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe('<li>Item one</li>');
    });
});

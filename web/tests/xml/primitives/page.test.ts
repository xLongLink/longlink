import { xmlToAST } from '@/xml/compiler';
import { registry } from '@/xml/registry';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Page', () => {
    /* The compiler should turn a raw <Page> element into a Page AST node. */
    it('compiles page xml into a page ast node', () => {
        expect(xmlToAST('<Page title="Dashboard" />')).toEqual([
            {
                name: 'Page',
                params: {
                    title: 'Dashboard',
                },
            },
        ]);
    });

    /*
     * This integration test proves that raw XML containing `<Page>` is parsed,
     * resolved through the runtime registry, and emitted as the expected page
     * container markup.
     */
    it('renders raw xml page content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Page title="Dashboard" />');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe('<div class="space-y-6"></div>');
    });
});

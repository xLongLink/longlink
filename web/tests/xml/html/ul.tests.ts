import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('ul', () => {
    /*
     * This integration test proves that raw XML containing `<ul>` is parsed,
     * resolved through the runtime registry, and emitted as the expected
     * styled HTML unordered list.
     */
    it('renders raw xml unordered list content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<ul><li>Item one</li></ul>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<ul class="my-6 ml-6 list-disc [&amp;&gt;li]:mt-2"><li>Item one</li></ul>'
        );
    });
});

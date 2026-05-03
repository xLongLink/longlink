import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('h2', () => {
    /*
     * This integration test proves that raw XML containing `<h2>` is parsed,
     * resolved through the runtime registry, and emitted as the expected
     * styled HTML heading.
     */
    it('renders raw xml h2 content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<h2>Heading two</h2>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<h2 class="text-3xl font-semibold tracking-tight [&amp;:not(:first-child)]:mt-8">Heading two</h2>'
        );
    });
});

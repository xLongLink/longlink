import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('h3', () => {
    /*
     * This integration test proves that raw XML containing `<h3>` is parsed,
     * resolved through the runtime registry, and emitted as the expected
     * styled HTML heading.
     */
    it('renders raw xml h3 content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<h3>Heading three</h3>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<h3 class="text-2xl font-semibold tracking-tight [&amp;:not(:first-child)]:mt-8">Heading three</h3>'
        );
    });
});

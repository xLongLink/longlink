import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('p', () => {
    /*
     * This integration test proves that raw XML containing `<p>` is parsed,
     * resolved through the runtime registry, and emitted as the expected
     * styled HTML paragraph.
     */
    it('renders raw xml paragraph content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<p>Paragraph text</p>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<p class="leading-7 [&amp;:not(:first-child)]:mt-6">Paragraph text</p>'
        );
    });
});

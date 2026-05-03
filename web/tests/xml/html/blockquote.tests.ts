import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('blockquote', () => {
    /*
     * This integration test proves that raw XML containing `<blockquote>` is
     * parsed, resolved through the runtime registry, and emitted as the
     * expected styled HTML blockquote.
     */
    it('renders raw xml blockquote content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<blockquote>Quoted text</blockquote>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<blockquote class="mt-6 border-l-2 pl-6 italic">Quoted text</blockquote>'
        );
    });
});

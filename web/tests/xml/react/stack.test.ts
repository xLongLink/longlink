import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Stack', () => {
    /* The compiler should keep stack direction and spacing props intact. */
    it('compiles stack xml into a stack ast node', () => {
        expect(xmlToAST('<Stack direction="row" gap="12" align="center" justify="between">Content</Stack>')).toEqual([
            {
                name: 'Stack',
                params: {
                    direction: 'row',
                    gap: '12',
                    align: 'center',
                    justify: 'between',
                },
                children: [{ name: 'text', value: 'Content' }],
            },
        ]);
    });

    /*
     * This integration test proves that raw XML containing `<Stack>` is parsed,
     * resolved through the runtime registry, and emitted with the expected flex
     * layout styles.
     */
    it('renders a row stack with spacing and alignment', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Stack direction="row" gap="12" align="center" justify="between">Content</Stack>');
        const renderedTree = renderNode(ast, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div class="flex flex-row" style="gap:12px;justify-content:space-between;align-items:center">Content</div>'
        );
    });

    it('falls back to column layout and default gap', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Stack>Content</Stack>');
        const renderedTree = renderNode(ast, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<div class="flex flex-col" style="gap:16px;justify-content:flex-start;align-items:stretch">Content</div>'
        );
    });
});

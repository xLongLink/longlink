import { ContextProvider, setupContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('renderNode', () => {
    it('returns null for missing node input', () => {
        expect(renderNode([], { setups: {}, invalidate: async () => {}, values: {} })).toEqual([]);
    });

    it('renders plain text nodes', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const node: ASTNode = { name: 'Text', params: { value: 'Hello' } };

        expect(
            renderToStaticMarkup(
                createElement('div', null, createElement(ContextProvider, { value: ctx, children: renderNode([node], ctx) }))
            )
        ).toBe('<div>Hello</div>');
    });

    it('preserves existing state when reactive conditions re-render', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const nodes: ASTNode[] = [
            { name: 'State', params: { id: 'gridSearch', value: 'Revenue' } },
            { name: 'Text', params: { if: "${gridSearch.value in 'Usage'}", value: 'Visible' } },
        ];

        await setupContext(nodes, ctx, '');
        renderToStaticMarkup(
            createElement('div', null, createElement(ContextProvider, { value: ctx, children: renderNode(nodes, ctx) }))
        );
        (ctx.values.gridSearch as { value: string }).value = 'Usage';

        expect(
            renderToStaticMarkup(
                createElement('div', null, createElement(ContextProvider, { value: ctx, children: renderNode(nodes, ctx) }))
            )
        ).toBe('<div>Visible</div>');
    });
});

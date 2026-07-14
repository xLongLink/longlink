import { createElement } from 'react';
import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { ContextProvider, setupContext } from '@/xml/core/context';

describe('renderNode', () => {
    it('rejects className on xml nodes', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        expect(() => renderNode([{ name: 'Button', params: { className: 'hidden' } }], ctx)).toThrow(
            'className is not supported in XML'
        );
    });

    it('preserves existing state when reactive conditions re-render', async () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { core: { visible: 'Visible' } },
            values: {},
        };
        const nodes: ASTNode[] = [
            { name: 'State', params: { id: 'gridSearch', value: 'Revenue' } },
            { name: 'P', params: { if: "${gridSearch.value in 'Usage'}", i18n: 'core.visible' } },
        ];

        await setupContext(nodes, ctx, '');
        renderToStaticMarkup(
            createElement('div', null, createElement(ContextProvider, { value: ctx, children: renderNode(nodes, ctx) }))
        );
        (ctx.values.gridSearch as { value: string }).value = 'Usage';

        expect(
            renderToStaticMarkup(
                createElement(
                    'div',
                    null,
                    createElement(ContextProvider, { value: ctx, children: renderNode(nodes, ctx) })
                )
            )
        ).toContain('Visible');
    });
});

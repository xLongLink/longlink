import { createElement } from 'react';
import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { ContextProvider, setupContext } from '@/xml/core/context';

describe('renderNode', () => {
    it('rejects styling and event handler attributes on xml nodes', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const cases = [
            { name: 'className', expected: 'className is not supported in XML' },
            { name: 'style', expected: 'style is not supported in XML' },
            { name: 'xstyle', expected: 'xstyle is not supported in XML' },
            { name: 'onClick', expected: 'Event handler attribute "onClick" is not supported in XML' },
        ];

        for (const testCase of cases) {
            expect(() => renderNode([{ name: 'Button', params: { [testCase.name]: 'value' } }], ctx)).toThrow(
                testCase.expected
            );
        }
    });

    it('preserves existing state when reactive conditions re-render', async () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translate: () => 'Visible',
            translations: { 'core.visible': { defaultMessage: 'Visible' } },
            values: {},
        };
        const nodes: ASTNode[] = [
            { name: 'State', params: { id: 'gridSearch', value: 'Revenue' } },
            { name: 'Text', params: { if: "${gridSearch.value in 'Usage'}", i18n: 'core.visible' } },
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

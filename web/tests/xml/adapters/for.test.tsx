import { ContextProvider, setupContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('For', () => {
    /* The compiler should preserve loop attributes and nested content. */
    it('compiles for xml into a for ast node', () => {
        expect(parseXML('<For each="items" as="item"><p>${item}</p></For>')).toEqual([
            {
                name: 'For',
                params: { each: 'items', as: 'item' },
                children: [{ name: 'p', children: [{ name: 'Text', params: { value: '${item}' } }] }],
            },
        ]);
    });

    /* Non-array results should render nothing instead of crashing. */
    it('returns null when each resolves to a non-array value', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {}, items: 'not-an-array' };
        const node: ASTNode = {
            name: 'For',
            params: { each: 'items', as: 'item' },
            children: [{ name: 'Text', params: { value: 'ignored' } }],
        };

        const output = renderToStaticMarkup(
            createElement(Fragment, null, createElement(RenderXML, { ast: [node], ctx }))
        );

        expect(output).toBe('');
    });

    /* Loop children should keep access to the scoped item value. */
    it('renders children with the scoped item value', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML(
            '<longlink><State id="items" value="[{&quot;name&quot;:&quot;Alpha&quot;}]" /><For each="${items.value}" as="item"><P>${item.name}</P></For></longlink>'
        );

        await setupContext(ast, ctx, '');

        expect(
            renderToStaticMarkup(
                createElement(
                    Fragment,
                    null,
                    createElement(ContextProvider, { value: ctx, children: renderNode(ast, ctx) })
                )
            )
        ).toContain('Alpha');
    });

    /* Missing loop parameters should be rejected immediately. */
    it('throws when each or as is missing', () => {
        expect(() =>
            renderToStaticMarkup(
                createElement(
                    'div',
                    null,
                    createElement(RenderXML, {
                        ast: [{ name: 'For', params: { as: 'item' } }],
                        ctx: { setups: {}, invalidate: async () => {}, values: {} },
                    })
                )
            )
        ).toThrow('For requires an "each" parameter');

        expect(() =>
            renderToStaticMarkup(
                createElement(
                    'div',
                    null,
                    createElement(RenderXML, {
                        ast: [{ name: 'For', params: { each: '[]' } }],
                        ctx: { setups: {}, invalidate: async () => {}, values: {} },
                    })
                )
            )
        ).toThrow('For requires an "as" parameter');
    });
});

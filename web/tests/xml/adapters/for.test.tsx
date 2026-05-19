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

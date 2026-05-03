import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { For } from '@/xml/primitives/For';
import { renderNode } from '@/xml/renderers';
import type { ASTNode, ExecutionContext, RegistryShape } from '@/xml/types';

describe('For', () => {
    /* The compiler should preserve loop attributes and nested content. */
    it('compiles for xml into a for ast node', () => {
        expect(xmlToAST('<For each="items" as="item"><p>{item}</p></For>')).toEqual([
            {
                name: 'For',
                params: { each: 'items', as: 'item' },
                children: [{ name: 'p', children: [{ name: 'text', value: '{item}' }] }],
            },
        ]);
    });

    /* Non-array results should render nothing instead of crashing. */
    it('returns null when each resolves to a non-array value', () => {
        const ctx: ExecutionContext = {
            state: { items: ["'not-an-array'", () => {}] },
            queries: {},
            scope: {},
        };
        const registry: RegistryShape = { For };
        const node: ASTNode = {
            name: 'For',
            params: { each: 'items', as: 'item' },
            children: [{ name: 'text', value: 'ignored' }],
        };

        const output = renderToStaticMarkup(createElement(Fragment, null, renderNode(node, registry, ctx)));

        expect(output).toBe('');
    });

    /* Missing loop parameters should be rejected immediately. */
    it('throws when each or as is missing', () => {
        expect(() => renderToStaticMarkup(createElement('div', null, createElement(For, { as: 'item' }, 'x')))).toThrow(
            'For requires an "each" parameter'
        );

        expect(() => renderToStaticMarkup(createElement('div', null, createElement(For, { each: '[]' }, 'x')))).toThrow(
            'For requires an "as" parameter'
        );
    });
});

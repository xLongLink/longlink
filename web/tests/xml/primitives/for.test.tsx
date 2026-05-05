import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('For', () => {
    /* The compiler should preserve loop attributes and nested content. */
    it('compiles for xml into a for ast node', () => {
        expect(xmlToAST('<For each="items" as="item"><p>{item}</p></For>')).toEqual([
            {
                name: 'For',
                params: { each: 'items', as: 'item' },
                children: [{ name: 'p', children: [{ name: 'Text', children: '{item}' }] }],
            },
        ]);
    });

    /* Non-array results should render nothing instead of crashing. */
    it('returns null when each resolves to a non-array value', () => {
        const ctx: ExecutionContext = { items: 'not-an-array' };
        const node: ASTNode = {
            name: 'For',
            params: { each: 'items', as: 'item' },
            children: [{ name: 'Text', children: 'ignored' }],
        };

        const output = renderToStaticMarkup(createElement(Fragment, null, render([node], ctx)));

        expect(output).toBe('');
    });

    /* Missing loop parameters should be rejected immediately. */
    it('throws when each or as is missing', () => {
        expect(() =>
            renderToStaticMarkup(createElement('div', null, render([{ name: 'For', params: { as: 'item' } }], {})))
        ).toThrow('For requires an "each" parameter');

        expect(() =>
            renderToStaticMarkup(createElement('div', null, render([{ name: 'For', params: { each: '[]' } }], {})))
        ).toThrow('For requires an "as" parameter');
    });
});

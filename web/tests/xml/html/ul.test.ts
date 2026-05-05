import { xmlToAST } from '@/xml/compiler';
import { registry } from '@/xml/registry';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Ul', () => {
    /* The compiler should preserve list items under an unordered list. */
    it('compiles ul xml into an unordered list ast node', () => {
        expect(xmlToAST('<ul role="list"><li>One</li><li>Two</li></ul>')).toEqual([
            {
                name: 'ul',
                params: {
                    role: 'list',
                },
                children: [
                    { name: 'li', children: [{ name: 'text', value: 'One' }] },
                    { name: 'li', children: [{ name: 'text', value: 'Two' }] },
                ],
            },
        ]);
    });

    /* The runtime should render unordered list XML into the expected HTML output. */
    it('renders raw xml unordered list content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<ul><li>Item one</li></ul>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<ul class="my-6 ml-6 list-disc [&amp;&gt;li]:mt-2"><li>Item one</li></ul>'
        );
    });
});

import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('H1', () => {
    /* The compiler should preserve H1 text content and attributes. */
    it('compiles h1 xml into an h1 ast node', () => {
        expect(xmlToAST('<h1 id="title">Heading</h1>')).toEqual([
            {
                name: 'h1',
                params: {
                    id: 'title',
                },
                children: [{ name: 'text', value: 'Heading' }],
            },
        ]);
    });

    /* The runtime should render h1 XML into the expected HTML output. */
    it('renders raw xml h1 content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<h1>Heading one</h1>');
        const renderedTree = renderNode(ast, registry, ctx);

        const runtimeProviderElement = renderedTree as any;
        const headingElement = runtimeProviderElement[0].props.children.props.children;

        expect(ast).toEqual([{ name: 'h1', children: [{ name: 'text', value: 'Heading one' }] }]);
        expect(headingElement.type).toBe(registry.h1);
        expect(renderToStaticMarkup(createElement(Fragment, null, renderedTree))).toBe(
            '<h1 class="text-4xl font-semibold tracking-tight [&amp;:not(:first-child)]:mt-8">Heading one</h1>'
        );
    });
});

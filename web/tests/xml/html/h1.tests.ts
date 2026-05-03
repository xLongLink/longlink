import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('h1', () => {
    /*
     * Integration test: it starts from raw XML, compiles that
     * XML into the AST, renders the AST through the XML runtime, and finally
     * asserts the exact HTML markup produced by React server rendering. The
     * goal is to prove that a plain `<h1>` element in XML becomes a styled
     * heading in the rendered output with the expected text content.
     */
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

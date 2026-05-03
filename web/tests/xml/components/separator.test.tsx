import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { Separator } from '@/xml/components/Separator';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('Separator', () => {
    /* The compiler should preserve separator tags without children. */
    it('compiles separator xml into a separator ast node', () => {
        expect(xmlToAST('<Separator />')).toEqual([{ name: 'Separator' }]);
    });

    /* The runtime should render separator XML into the expected horizontal rule. */
    it('renders raw xml separator content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Separator />');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('role="separator"');
    });

    /* The adapter should still render the underlying separator component directly. */
    it('renders a separator when used directly', () => {
        expect(renderToStaticMarkup(createElement(Separator, null))).toContain('role="separator"');
    });
});

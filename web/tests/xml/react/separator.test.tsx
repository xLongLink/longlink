import { xmlToAST } from '@/xml/compiler';
import { Separator } from '@/xml/react/Separator';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Separator', () => {
    /* The compiler should preserve separator tags without children. */
    it('compiles separator xml into a separator ast node', () => {
        expect(xmlToAST('<Separator />')).toEqual([{ name: 'Separator' }]);
    });

    /* The runtime should render separator XML into the expected horizontal rule. */
    it('renders raw xml separator content end to end', () => {
        const ctx: ExecutionContext = {};
        const ast = xmlToAST('<Separator />');
        const renderedTree = render(ast, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('role="separator"');
    });

    /* The adapter should still render the underlying separator component directly. */
    it('renders a separator when used directly', () => {
        expect(renderToStaticMarkup(createElement(Separator, null))).toContain('role="separator"');
    });
});

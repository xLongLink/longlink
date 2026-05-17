import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Icon', () => {
    /* The compiler should preserve icon attributes as raw strings. */
    it('compiles icon xml into an icon ast node', () => {
        expect(parseXML('<Icon name="layout-grid" className="size-4" />')).toEqual([
            {
                name: 'Icon',
                params: { className: 'size-4', name: 'layout-grid' },
            },
        ]);
    });

    /* The runtime should render Icon XML into a lucide svg. */
    it('renders icon xml end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Icon name="layout-grid" className="size-4" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        const output = renderToStaticMarkup(createElement('div', null, renderedTree));

        expect(output).toContain('<svg');
        expect(output).toContain('aria-hidden="true"');
        expect(output).toContain('size-4');
    });
});

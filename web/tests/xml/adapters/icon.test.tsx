import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Icon', () => {
    /* The compiler should preserve icon attributes as raw strings. */
    it('compiles icon xml into an icon ast node', () => {
        expect(parseXML('<Icon name="layout-grid" />')).toEqual([
            {
                name: 'Icon',
                params: { name: 'layout-grid' },
                children: [],
            },
        ]);
    });

    /* Common platform icons should render directly without loading the full Lucide dynamic map. */
    it('renders icon xml end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Icon name="layout-grid" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        const output = renderToStaticMarkup(createElement('div', null, renderedTree));

        expect(output).toContain('class="lucide lucide-layout-grid size-4 shrink-0"');
    });
});

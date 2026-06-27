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

    /* The runtime should accept Icon XML without breaking server rendering. */
    it('renders icon xml end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Icon name="layout-grid" />');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        const output = renderToStaticMarkup(createElement('div', null, renderedTree));

        expect(output).toBe('<div></div>');
    });
});

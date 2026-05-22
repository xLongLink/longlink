import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Badge', () => {
    /* The compiler should preserve badge attributes as raw strings. */
    it('compiles badge xml into a badge ast node', () => {
        expect(parseXML('<Badge>New</Badge>')).toEqual([
            {
                name: 'Badge',
                children: [{ name: 'Text', params: { value: 'New' } }],
            },
        ]);
    });

    /* The runtime should render Badge XML into the shadcn badge output. */
    it('renders raw xml badge content end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Badge>New</Badge>');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        const output = renderToStaticMarkup(createElement('div', null, renderedTree));

        expect(output).toContain('<span');
        expect(output).toContain('bg-primary');
        expect(output).toContain('New');
    });
});

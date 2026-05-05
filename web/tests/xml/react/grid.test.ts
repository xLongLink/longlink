import { xmlToAST } from '@/xml/compiler';
import { Grid } from '@/xml/react/Grid';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Grid', () => {
    /* The compiler should preserve grid attributes and text content. */
    it('compiles grid xml into a grid ast node', () => {
        expect(xmlToAST('<Grid gap="2rem">Content</Grid>')).toEqual([
            {
                name: 'Grid',
                params: { gap: '2rem' },
                children: [{ name: 'text', value: 'Content' }],
            },
        ]);
    });

    /* The runtime should render grid XML into the expected HTML output. */
    it('renders raw xml grid content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Grid gap="2rem">Content</Grid>');
        const renderedTree = renderNode(ast, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toBe(
            '<div><div style="display:grid;gap:2rem">Content</div></div>'
        );
    });

    /* Grid should still map XML-style layout props onto inline CSS grid styles. */
    it('renders grid styles and merges custom style overrides', () => {
        const output = renderToStaticMarkup(
            createElement(
                Grid,
                {
                    gap: '2rem',
                    columns: '1fr 2fr',
                    align: 'center',
                    justify: 'end',
                    style: { gap: '4rem' },
                },
                'Content'
            )
        );

        expect(output).toBe(
            '<div style="display:grid;gap:4rem;grid-template-columns:1fr 2fr;align-items:center;justify-items:end">Content</div>'
        );
    });

    /* Grid should still render through the XML registry end to end. */
    it('renders raw xml grid content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Grid gap="2rem" columns="1fr 2fr">Content</Grid>');
        const renderedTree = renderNode(ast, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toBe(
            '<div><div style="display:grid;gap:2rem;grid-template-columns:1fr 2fr">Content</div></div>'
        );
    });
});

import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderXmlToMarkup } from '../helpers';

describe('Button', () => {
    /* Variant should flow into the shared button class recipe. */
    it('applies the requested variant', () => {
        const ast = parseXML('<Button variant="destructive">Delete</Button>');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('bg-destructive/10');
        expect(output).toContain('Delete');
    });

    /* Size should flow into the shared button class recipe. */
    it('applies the requested size', () => {
        const ast = parseXML('<Button size="lg">Save</Button>');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('h-9');
        expect(output).toContain('Save');
    });

    /* Submit mode should render a native submit control. */
    it('renders a submit button when submit is enabled', () => {
        const ast = parseXML('<Button submit="true">Submit</Button>');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('<button');
        expect(output).toContain('type="submit"');
        expect(output).toContain('Submit');
    });

    /* Disabled should mark the rendered button as inactive. */
    it('disables normal buttons when disabled is set', () => {
        const ast = parseXML('<Button disabled="true">Submit</Button>');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('<button');
        expect(output).toContain('disabled');
        expect(output).toContain('Submit');
    });

    /* The runtime should honor conditional rendering on button nodes. */
    it('skips a button when if resolves false', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast = parseXML('<Button if="${false}">Hidden</Button>');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toBe('<div></div>');
    });

    /* The compiler should preserve the if parameter on button nodes. */
    it('preserves if in compiled xml', () => {
        expect(parseXML('<Button if="${true}">Visible</Button>')).toEqual([
            {
                name: 'Button',
                params: { if: '${true}' },
                children: [{ name: 'Text', params: { value: 'Visible' } }],
            },
        ]);
    });
});

import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderXmlToMarkup } from '../helpers';

describe('Button', () => {
    /* External href buttons should render as anchors. */
    it('renders an anchor when href is external', () => {
        const output = renderXmlToMarkup(
            parseXML('<Button href="https://example.com" variant="default">Open</Button>')
        );

        expect(output).toContain('<a');
        expect(output).toContain('href="https://example.com"');
        expect(output).toContain('Open');
    });

    /* Internal href buttons should stay inside the app router. */
    it('preserves an internal href in compiled xml', () => {
        expect(parseXML('<Button href="/issues">Open issues</Button>')).toEqual([
            {
                name: 'Button',
                params: { href: '/issues' },
                children: [{ name: 'Text', children: 'Open issues' }],
            },
        ]);
    });

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

    /* Disabled should mark the rendered button as inactive. */
    it('disables normal buttons when disabled is set', () => {
        const ast = parseXML('<Button disabled="true">Submit</Button>');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('<button');
        expect(output).toContain('disabled');
        expect(output).toContain('Submit');
    });

    /* Action buttons should still render as disabled when requested. */
    it('disables action buttons when disabled is set', () => {
        const ast = parseXML('<Button action="/issues" disabled="true">Submit</Button>');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('<button');
        expect(output).toContain('disabled');
        expect(output).toContain('Submit');
    });

    /* Action props should remain part of the XML contract. */
    it('preserves action parameters in compiled xml', () => {
        expect(
            parseXML(
                '<Button action="/issues" json=' +
                    '\'{"title":"{issue.title}"}\'' +
                    ' invalidate="issues">Save</Button>'
            )
        ).toEqual([
            {
                name: 'Button',
                params: {
                    action: '/issues',
                    json: '{"title":"{issue.title}"}',
                    invalidate: 'issues',
                },
                children: [{ name: 'Text', children: 'Save' }],
            },
        ]);
    });

    /* The runtime should honor conditional rendering on button nodes. */
    it('skips a button when if resolves false', () => {
        const ctx: ExecutionContext = { values: {} };
        const ast = parseXML('<Button if="{false}">Hidden</Button>');
        const renderedTree = createElement(RenderXML, { ast, ctx });

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toBe('<div></div>');
    });

    /* The compiler should preserve the if parameter on button nodes. */
    it('preserves if in compiled xml', () => {
        expect(parseXML('<Button if="{true}">Visible</Button>')).toEqual([
            {
                name: 'Button',
                params: { if: '{true}' },
                children: [{ name: 'Text', children: 'Visible' }],
            },
        ]);
    });
});

import { xmlToAST } from '@/xml/compiler';
import { Button } from '@/xml/react/Button';
import { registry } from '@/xml/registry';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Button', () => {
    /* External href buttons should render as anchors. */
    it('renders an anchor when href is external', () => {
        const output = renderToStaticMarkup(
            createElement(Button, { href: 'https://example.com', variant: 'default' }, 'Open')
        );

        expect(output).toContain('<a');
        expect(output).toContain('href="https://example.com"');
        expect(output).toContain('Open');
    });

    /* Internal href buttons should stay inside the app router. */
    it('preserves an internal href in compiled xml', () => {
        expect(xmlToAST('<Button href="/issues">Open issues</Button>')).toEqual([
            {
                name: 'Button',
                params: { href: '/issues' },
                children: [{ name: 'text', value: 'Open issues' }],
            },
        ]);
    });

    /* Variant should flow into the shared button class recipe. */
    it('applies the requested variant', () => {
        const ast = xmlToAST('<Button variant="destructive">Delete</Button>');
        const output = renderToStaticMarkup(
            createElement('div', null, renderNode(ast, registry, { state: {}, queries: {}, scope: {} }))
        );

        expect(output).toContain('bg-destructive/10');
        expect(output).toContain('Delete');
    });

    /* Size should flow into the shared button class recipe. */
    it('applies the requested size', () => {
        const ast = xmlToAST('<Button size="lg">Save</Button>');
        const output = renderToStaticMarkup(
            createElement('div', null, renderNode(ast, registry, { state: {}, queries: {}, scope: {} }))
        );

        expect(output).toContain('h-9');
        expect(output).toContain('Save');
    });

    /* Disabled should mark the rendered button as inactive. */
    it('disables normal buttons when disabled is set', () => {
        const ast = xmlToAST('<Button disabled="true">Submit</Button>');
        const output = renderToStaticMarkup(
            createElement('div', null, renderNode(ast, registry, { state: {}, queries: {}, scope: {} }))
        );

        expect(output).toContain('<button');
        expect(output).toContain('disabled');
        expect(output).toContain('Submit');
    });

    /* Action buttons should still render as disabled when requested. */
    it('disables action buttons when disabled is set', () => {
        const ast = xmlToAST('<Button action="/issues" disabled="true">Submit</Button>');
        const output = renderToStaticMarkup(
            createElement('div', null, renderNode(ast, registry, { state: {}, queries: {}, scope: {} }))
        );

        expect(output).toContain('<button');
        expect(output).toContain('disabled');
        expect(output).toContain('Submit');
    });

    /* Action props should remain part of the XML contract. */
    it('preserves action parameters in compiled xml', () => {
        expect(
            xmlToAST(
                '<Button action="/issues" method="POST" payload=' +
                    '\'{"title":"{issue.title}"}\'' +
                    ' invalidate="issues">Save</Button>'
            )
        ).toEqual([
            {
                name: 'Button',
                params: {
                    action: '/issues',
                    method: 'POST',
                    payload: '{"title":"{issue.title}"}',
                    invalidate: 'issues',
                },
                children: [{ name: 'text', value: 'Save' }],
            },
        ]);
    });

    /* The runtime should honor conditional rendering on button nodes. */
    it('skips a button when if resolves false', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Button if="{false}">Hidden</Button>');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toBe('<div></div>');
    });

    /* The compiler should preserve the if parameter on button nodes. */
    it('preserves if in compiled xml', () => {
        expect(xmlToAST('<Button if="{true}">Visible</Button>')).toEqual([
            {
                name: 'Button',
                params: { if: '{true}' },
                children: [{ name: 'text', value: 'Visible' }],
            },
        ]);
    });
});

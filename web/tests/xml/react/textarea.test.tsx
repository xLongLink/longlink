import { xmlToAST } from '@/xml/compiler';
import { Textarea } from '@/xml/react/Textarea';
import { registry } from '@/xml/registry';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Textarea', () => {
    /* The compiler should preserve textarea tags and text labels. */
    it('compiles textarea xml into a textarea ast node', () => {
        expect(xmlToAST('<Textarea label="Notes" />')).toEqual([{ name: 'Textarea', params: { label: 'Notes' } }]);
    });

    /* The runtime should render textarea XML into the expected markup. */
    it('renders raw xml textarea content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Textarea label="Notes" description="Add details" />');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Add details');
    });

    /* The adapter should preserve label text when rendered directly. */
    it('renders a labeled textarea directly', () => {
        expect(renderToStaticMarkup(createElement(Textarea, { label: 'Notes' }))).toContain('Notes');
    });
});

import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { Switch } from '@/xml/components/Switch';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('Switch', () => {
    /* The compiler should preserve switch tags and metadata. */
    it('compiles switch xml into a switch ast node', () => {
        expect(xmlToAST('<Switch label="Enabled" active="true" />')).toEqual([
            {
                name: 'Switch',
                params: { label: 'Enabled', active: 'true' },
            },
        ]);
    });

    /* The runtime should render switch XML into the expected markup. */
    it('renders raw xml switch content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Switch label="Enabled" description="Feature toggle" active="true" />');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Feature toggle');
    });

    /* The adapter should preserve the label text when rendered directly. */
    it('renders a labeled switch directly', () => {
        expect(renderToStaticMarkup(createElement(Switch, { label: 'Enabled' }))).toContain('Enabled');
    });
});

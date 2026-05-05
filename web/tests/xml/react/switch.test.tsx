import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderXmlToMarkup } from '../helpers';

describe('Switch', () => {
    /* The compiler should preserve switch tags and metadata. */
    it('compiles switch xml into a switch ast node', () => {
        expect(xmlToAST('<Switch label="Enabled" checked="true" />')).toEqual([
            {
                name: 'Switch',
                params: { label: 'Enabled', checked: 'true' },
            },
        ]);
    });

    /* The runtime should render switch XML into the expected markup. */
    it('renders raw xml switch content end to end', () => {
        const ctx: ExecutionContext = {};
        const ast = xmlToAST('<Switch label="Enabled" description="Feature toggle" checked="true" />');
        const renderedTree = render(ast, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Feature toggle');
    });

    /* The adapter should preserve the label text when rendered directly. */
    it('renders a labeled switch directly', () => {
        expect(renderXmlToMarkup(xmlToAST('<Switch label="Enabled" />'))).toContain('Enabled');
    });
});

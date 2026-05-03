import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { Slider } from '@/xml/components/Slider';
import { renderNode } from '@/xml/renderers';
import { registry } from '@/xml/registry';
import type { ExecutionContext } from '@/xml/types';

describe('Slider', () => {
    /* The compiler should preserve slider attributes. */
    it('compiles slider xml into a slider ast node', () => {
        expect(xmlToAST('<Slider label="Volume" value="50" />')).toEqual([
            { name: 'Slider', params: { label: 'Volume', value: '50' } },
        ]);
    });

    /* The runtime should render slider XML into the expected markup. */
    it('renders raw xml slider content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Slider label="Volume" value="50" description="Set level" />');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('50');
    });

    /* The adapter should display the normalized value directly. */
    it('renders a labeled slider directly', () => {
        expect(renderToStaticMarkup(createElement(Slider, { label: 'Volume', value: 50 }))).toContain('50');
    });
});

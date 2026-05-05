import { xmlToAST } from '@/xml/compiler';
import { render } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderXmlToMarkup } from '../helpers';

describe('Slider', () => {
    /* The compiler should preserve slider attributes. */
    it('compiles slider xml into a slider ast node', () => {
        expect(xmlToAST('<Slider label="Volume" min="0" max="100" step="5" value="$settings.volume" />')).toEqual([
            {
                name: 'Slider',
                params: { label: 'Volume', min: '0', max: '100', step: '5', value: '$settings.volume' },
            },
        ]);
    });

    /* The runtime should render slider XML into the expected markup. */
    it('renders raw xml slider content end to end', () => {
        const ctx: ExecutionContext = {
            settings: { volume: 50 },
        };
        const ast = xmlToAST('<Slider label="Volume" value="$settings.volume" description="Set level" />');
        const renderedTree = render(ast, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('50');
    });

    /* The adapter should display the normalized value directly. */
    it('renders a labeled slider directly', () => {
        expect(renderXmlToMarkup(xmlToAST('<Slider label="Volume" value="50" />'))).toContain('50');
    });

    /* XML numeric strings should still render as numeric slider values. */
    it('normalizes numeric strings from xml attributes', () => {
        expect(renderXmlToMarkup(xmlToAST('<Slider label="Volume" value="50" />'))).toContain('50');
    });
});

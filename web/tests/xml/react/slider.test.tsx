import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Slider', () => {
    /* The compiler should preserve slider attributes as raw strings. */
    it('compiles slider xml into a slider ast node', () => {
        expect(parseXML('<Slider defaultValue="${[25]}" min="0" max="100" step="5" />')).toEqual([
            {
                name: 'Slider',
                params: { defaultValue: '${[25]}', max: '100', min: '0', step: '5' },
            },
        ]);
    });

    /* The runtime should render the shadcn slider shell. */
    it('renders slider markup end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Slider defaultValue="${[25]}" min="0" max="100" step="5" />'));

        expect(output).toContain('data-slot="slider"');
        expect(output).toContain('data-slot="slider-track"');
        expect(output).toContain('data-slot="slider-thumb"');
    });
});

import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Switch', () => {
    /* The compiler should preserve switch attributes as raw strings. */
    it('compiles switch xml into a switch ast node', () => {
        expect(parseXML('<Switch defaultChecked="true" size="sm" />')).toEqual([
            {
                name: 'Switch',
                params: { defaultChecked: 'true', size: 'sm' },
            },
        ]);
    });

    /* The runtime should render the shadcn switch shell. */
    it('renders switch markup end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Switch defaultChecked="true" size="sm" />'));

        expect(output).toContain('data-slot="switch"');
        expect(output).toContain('data-size="sm"');
        expect(output).toContain('aria-checked="true"');
    });
});

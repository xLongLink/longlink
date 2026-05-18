import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Textarea', () => {
    /* The compiler should preserve textarea attributes as raw strings. */
    it('compiles textarea xml into a textarea ast node', () => {
        expect(parseXML('<Textarea placeholder="Notes" rows="4" value="Draft notes" />')).toEqual([
            {
                name: 'Textarea',
                params: { placeholder: 'Notes', rows: '4', value: 'Draft notes' },
                children: [],
            },
        ]);
    });

    /* The runtime should render the shadcn textarea shell. */
    it('renders textarea markup end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Textarea placeholder="Notes" rows="4" value="Draft notes" />'));

        expect(output).toContain('data-slot="textarea"');
        expect(output).toContain('Draft notes');
        expect(output).toContain('placeholder="Notes"');
    });
});

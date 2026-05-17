import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Checkbox', () => {
    /* The compiler should preserve checkbox attributes as raw strings. */
    it('compiles checkbox xml into a checkbox ast node', () => {
        expect(parseXML('<Checkbox defaultChecked="true" disabled="true" />')).toEqual([
            {
                name: 'Checkbox',
                params: { defaultChecked: 'true', disabled: 'true' },
            },
        ]);
    });

    /* The runtime should render the shadcn checkbox shell. */
    it('renders checkbox markup end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Checkbox defaultChecked="true" />'));

        expect(output).toContain('data-slot="checkbox"');
        expect(output).toContain('aria-checked="true"');
    });
});

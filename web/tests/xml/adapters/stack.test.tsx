import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Stack', () => {
    /* The parser should preserve the stack shell and its children. */
    it('preserves the stack structure in compiled xml', () => {
        expect(parseXML('<Stack><P i18n="First" /><P i18n="Second" /></Stack>')).toEqual([
            {
                name: 'Stack',
                children: [
                    { name: 'P', params: { i18n: 'First' }, children: [] },
                    { name: 'P', params: { i18n: 'Second' }, children: [] },
                ],
            },
        ]);
    });

    /* The runtime should render the vertical stack shell and content. */
    it('renders the stack composition', () => {
        const output = renderXmlToMarkup(parseXML('<Stack><P i18n="First" /><P i18n="Second" /></Stack>'));

        expect(output).toContain('data-slot="stack"');
        expect(output).toContain('flex flex-col gap-4');
        expect(output).toContain('First');
        expect(output).toContain('Second');
    });
});

import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Toggle', () => {
    /* The compiler should preserve toggle attributes as raw strings. */
    it('compiles toggle xml into a toggle ast node', () => {
        expect(parseXML('<Toggle defaultPressed="true" size="sm" variant="outline" />')).toEqual([
            {
                name: 'Toggle',
                params: { defaultPressed: 'true', size: 'sm', variant: 'outline' },
                children: [],
            },
        ]);
    });

    /* The runtime should render the shadcn toggle shell. */
    it('renders toggle markup end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Toggle defaultPressed="true" size="sm"><P i18n="On" /></Toggle>'));

        expect(output).toContain('data-slot="toggle"');
        expect(output).toContain('aria-pressed="true"');
        expect(output).toContain('On');
    });
});

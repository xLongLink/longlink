import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('ToggleGroup', () => {
    /* The compiler should preserve the compound toggle group structure. */
    it('preserves the toggle group xml structure', () => {
        expect(
            parseXML(
                '<ToggleGroup type="single"><ToggleGroupItem value="a"><P i18n="A" /></ToggleGroupItem><ToggleGroupItem value="b"><P i18n="B" /></ToggleGroupItem></ToggleGroup>'
            )
        ).toEqual([
            {
                name: 'ToggleGroup',
                params: { type: 'single' },
                children: [
                    {
                        name: 'ToggleGroupItem',
                        params: { value: 'a' },
                        children: [{ name: 'P', params: { i18n: 'A' }, children: [] }],
                    },
                    {
                        name: 'ToggleGroupItem',
                        params: { value: 'b' },
                        children: [{ name: 'P', params: { i18n: 'B' }, children: [] }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the toggle group shell and items. */
    it('renders toggle group markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<ToggleGroup type="single"><ToggleGroupItem value="a"><P i18n="A" /></ToggleGroupItem><ToggleGroupItem value="b"><P i18n="B" /></ToggleGroupItem><ToggleGroupItem value="c"><P i18n="C" /></ToggleGroupItem></ToggleGroup>'
            )
        );

        expect(output).toContain('data-slot="toggle-group"');
        expect(output).toContain('data-slot="toggle-group-item"');
        expect(output).toContain('A');
        expect(output).toContain('B');
        expect(output).toContain('C');
    });
});

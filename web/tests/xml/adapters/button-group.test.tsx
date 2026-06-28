import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('ButtonGroup', () => {
    /* The compiler should preserve the compound button group structure. */
    it('preserves the button group xml structure', () => {
        expect(
            parseXML(
                '<ButtonGroup orientation="vertical"><Button i18n="Save" /><Input value="Search" /><ButtonGroupSeparator orientation="horizontal" /><ButtonGroupText i18n="Quick actions" /></ButtonGroup>'
            )
        ).toEqual([
            {
                name: 'ButtonGroup',
                params: { orientation: 'vertical' },
                children: [
                    {
                        name: 'Button',
                        params: { i18n: 'Save' },
                        children: [],
                    },
                    {
                        name: 'Input',
                        params: { value: 'Search' },
                        children: [],
                    },
                    {
                        name: 'ButtonGroupSeparator',
                        params: { orientation: 'horizontal' },
                        children: [],
                    },
                    {
                        name: 'ButtonGroupText',
                        params: { i18n: 'Quick actions' },
                        children: [],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the button group shell and helper slots. */
    it('renders button group markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<ButtonGroup><Button i18n="Save" /><Input value="Search" /><ButtonGroupSeparator /><ButtonGroupText i18n="Quick actions" /></ButtonGroup>'
            )
        );

        expect(output).toContain('data-slot="button-group"');
        expect(output).toContain('data-slot="button-group-separator"');
        expect(output).toContain('data-slot="button-group-text"');
        expect(output).toContain('Save');
        expect(output).toContain('Search');
        expect(output).toContain('Quick actions');
    });
});

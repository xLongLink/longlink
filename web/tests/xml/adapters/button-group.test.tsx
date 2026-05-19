import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('ButtonGroup', () => {
    /* The compiler should preserve the compound button group structure. */
    it('preserves the button group xml structure', () => {
        expect(
            parseXML(
                '<ButtonGroup orientation="vertical"><Button>Save</Button><Input value="Search" /><ButtonGroupSeparator orientation="horizontal" /><ButtonGroupText>Quick actions</ButtonGroupText></ButtonGroup>'
            )
        ).toEqual([
            {
                name: 'ButtonGroup',
                params: { orientation: 'vertical' },
                children: [
                    {
                        name: 'Button',
                        children: [{ name: 'Text', params: { value: 'Save' } }],
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
                        children: [{ name: 'Text', params: { value: 'Quick actions' } }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the button group shell and helper slots. */
    it('renders button group markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<ButtonGroup><Button>Save</Button><Input value="Search" /><ButtonGroupSeparator /><ButtonGroupText>Quick actions</ButtonGroupText></ButtonGroup>'
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

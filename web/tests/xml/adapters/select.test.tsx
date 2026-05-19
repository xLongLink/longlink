import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Select', () => {
    /* The compiler should preserve the full select composition. */
    it('preserves the compound select structure in compiled xml', () => {
        expect(
            parseXML(
                '<Select defaultValue="overview"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Views</SelectLabel><SelectItem value="overview">Overview</SelectItem><SelectItem value="settings">Settings</SelectItem></SelectGroup><SelectSeparator /><SelectGroup><SelectLabel>Status</SelectLabel><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectGroup></SelectContent></Select>'
            )
        ).toEqual([
            {
                name: 'Select',
                params: { defaultValue: 'overview' },
                children: [
                    {
                        name: 'SelectTrigger',
                        children: [{ name: 'SelectValue', children: [] }],
                    },
                    {
                        name: 'SelectContent',
                        children: [
                            {
                                name: 'SelectGroup',
                                children: [
                                    {
                                        name: 'SelectLabel',
                                        children: [{ name: 'Text', params: { value: 'Views' } }],
                                    },
                                    {
                                        name: 'SelectItem',
                                        params: { value: 'overview' },
                                        children: [{ name: 'Text', params: { value: 'Overview' } }],
                                    },
                                    {
                                        name: 'SelectItem',
                                        params: { value: 'settings' },
                                        children: [{ name: 'Text', params: { value: 'Settings' } }],
                                    },
                                ],
                            },
                            {
                                name: 'SelectSeparator',
                                children: [],
                            },
                            {
                                name: 'SelectGroup',
                                children: [
                                    {
                                        name: 'SelectLabel',
                                        children: [{ name: 'Text', params: { value: 'Status' } }],
                                    },
                                    {
                                        name: 'SelectItem',
                                        params: { value: 'active' },
                                        children: [{ name: 'Text', params: { value: 'Active' } }],
                                    },
                                    {
                                        name: 'SelectItem',
                                        params: { value: 'archived' },
                                        children: [{ name: 'Text', params: { value: 'Archived' } }],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the trigger, selected value, and hidden input. */
    it('renders the select shell in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Select defaultValue="overview"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Views</SelectLabel><SelectItem value="overview">Overview</SelectItem><SelectItem value="settings">Settings</SelectItem></SelectGroup><SelectSeparator /><SelectGroup><SelectLabel>Status</SelectLabel><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectGroup></SelectContent></Select>'
            )
        );

        expect(output).toContain('data-slot="select-trigger"');
        expect(output).toContain('data-slot="select-value"');
        expect(output).toContain('value="overview"');
        expect(output).toContain('overview');
    });
});

import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Menu', () => {
    /* The compiler should preserve the nested menu structure. */
    it('preserves the nested menu structure in compiled xml', () => {
        expect(
            parseXML(
                '<Menu defaultValue="overview"><MenuSection value="overview" label="Overview"><P>Overview content</P></MenuSection><MenuSection value="settings" label="Settings"><P>Settings content</P><MenuSubSection value="profile" label="Profile"><P>Profile content</P></MenuSubSection><MenuSubSection value="billing" label="Billing"><P>Billing content</P></MenuSubSection></MenuSection></Menu>'
            )
        ).toEqual([
            {
                name: 'Menu',
                params: { defaultValue: 'overview' },
                children: [
                    {
                        name: 'MenuSection',
                        params: { value: 'overview', label: 'Overview' },
                        children: [
                            {
                                name: 'P',
                                children: [{ name: 'Text', params: { value: 'Overview content' } }],
                            },
                        ],
                    },
                    {
                        name: 'MenuSection',
                        params: { value: 'settings', label: 'Settings' },
                        children: [
                            {
                                name: 'P',
                                children: [{ name: 'Text', params: { value: 'Settings content' } }],
                            },
                            {
                                name: 'MenuSubSection',
                                params: { value: 'profile', label: 'Profile' },
                                children: [
                                    {
                                        name: 'P',
                                        children: [{ name: 'Text', params: { value: 'Profile content' } }],
                                    },
                                ],
                            },
                            {
                                name: 'MenuSubSection',
                                params: { value: 'billing', label: 'Billing' },
                                children: [
                                    {
                                        name: 'P',
                                        children: [{ name: 'Text', params: { value: 'Billing content' } }],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the sidebar menu shell and active panel. */
    it('renders the menu shell in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Menu defaultValue="overview"><MenuSection value="overview" label="Overview"><P>Overview content</P></MenuSection><MenuSection value="settings" label="Settings"><P>Settings content</P><MenuSubSection value="profile" label="Profile"><P>Profile content</P></MenuSubSection><MenuSubSection value="billing" label="Billing"><P>Billing content</P></MenuSubSection></MenuSection></Menu>'
            )
        );

        expect(output).toContain('Section menu');
        expect(output).toContain('Overview');
        expect(output).toContain('Settings');
        expect(output).toContain('Overview content');
        expect(output).not.toContain('Settings content');
        expect(output).not.toContain('Profile content');
    });
});

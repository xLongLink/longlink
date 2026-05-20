import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Menu', () => {
    /* The compiler should preserve the full menu structure. */
    it('preserves the compound menu structure in compiled xml', () => {
        expect(
            parseXML(
                '<Menu defaultValue="overview"><MenuList><MenuSection value="overview">Overview</MenuSection><MenuSection value="settings">Settings<MenuSubSection value="profile">Profile</MenuSubSection><MenuSubSection value="billing">Billing</MenuSubSection></MenuSection></MenuList><MenuContent value="overview">Overview content</MenuContent><MenuContent value="settings">Settings content</MenuContent><MenuContent value="profile">Profile content</MenuContent><MenuContent value="billing">Billing content</MenuContent></Menu>'
            )
        ).toEqual([
            {
                name: 'Menu',
                params: { defaultValue: 'overview' },
                children: [
                    {
                        name: 'MenuList',
                        children: [
                            {
                                name: 'MenuSection',
                                params: { value: 'overview' },
                                children: [{ name: 'Text', params: { value: 'Overview' } }],
                            },
                            {
                                name: 'MenuSection',
                                params: { value: 'settings' },
                                children: [
                                    { name: 'Text', params: { value: 'Settings' } },
                                    {
                                        name: 'MenuSubSection',
                                        params: { value: 'profile' },
                                        children: [{ name: 'Text', params: { value: 'Profile' } }],
                                    },
                                    {
                                        name: 'MenuSubSection',
                                        params: { value: 'billing' },
                                        children: [{ name: 'Text', params: { value: 'Billing' } }],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'MenuContent',
                        params: { value: 'overview' },
                        children: [{ name: 'Text', params: { value: 'Overview content' } }],
                    },
                    {
                        name: 'MenuContent',
                        params: { value: 'settings' },
                        children: [{ name: 'Text', params: { value: 'Settings content' } }],
                    },
                    {
                        name: 'MenuContent',
                        params: { value: 'profile' },
                        children: [{ name: 'Text', params: { value: 'Profile content' } }],
                    },
                    {
                        name: 'MenuContent',
                        params: { value: 'billing' },
                        children: [{ name: 'Text', params: { value: 'Billing content' } }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the sidebar menu shell and active panel. */
    it('renders the menu shell in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Menu defaultValue="overview"><MenuList><MenuSection value="overview">Overview</MenuSection><MenuSection value="settings">Settings<MenuSubSection value="profile">Profile</MenuSubSection><MenuSubSection value="billing">Billing</MenuSubSection></MenuSection></MenuList><MenuContent value="overview">Overview content</MenuContent><MenuContent value="settings">Settings content</MenuContent><MenuContent value="profile">Profile content</MenuContent><MenuContent value="billing">Billing content</MenuContent></Menu>'
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

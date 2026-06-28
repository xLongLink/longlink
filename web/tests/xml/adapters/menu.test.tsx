import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Menu', () => {
    /* The compiler should preserve the nested menu structure. */
    it('preserves the nested menu structure in compiled xml', () => {
        expect(
            parseXML(
                '<Menu defaultValue="overview"><MenuSection value="overview" i18n="Overview" icon="layout-grid"><P i18n="Overview content" /></MenuSection><MenuSection value="settings" i18n="Settings" icon="shield"><P i18n="Settings content" /><MenuSubSection value="profile" i18n="Profile"><P i18n="Profile content" /></MenuSubSection><MenuSubSection value="billing" i18n="Billing"><P i18n="Billing content" /></MenuSubSection></MenuSection></Menu>'
            )
        ).toEqual([
            {
                name: 'Menu',
                params: { defaultValue: 'overview' },
                children: [
                    {
                        name: 'MenuSection',
                        params: { value: 'overview', i18n: 'Overview', icon: 'layout-grid' },
                        children: [
                            {
                                name: 'P',
                                params: { i18n: 'Overview content' },
                                children: [],
                            },
                        ],
                    },
                    {
                        name: 'MenuSection',
                        params: { value: 'settings', i18n: 'Settings', icon: 'shield' },
                        children: [
                            {
                                name: 'P',
                                params: { i18n: 'Settings content' },
                                children: [],
                            },
                            {
                                name: 'MenuSubSection',
                                params: { value: 'profile', i18n: 'Profile' },
                                children: [
                                    {
                                        name: 'P',
                                        params: { i18n: 'Profile content' },
                                        children: [],
                                    },
                                ],
                            },
                            {
                                name: 'MenuSubSection',
                                params: { value: 'billing', i18n: 'Billing' },
                                children: [
                                    {
                                        name: 'P',
                                        params: { i18n: 'Billing content' },
                                        children: [],
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
                '<Menu defaultValue="overview"><MenuSection value="overview" i18n="Overview" icon="layout-grid"><P i18n="Overview content" /></MenuSection><MenuSection value="settings" i18n="Settings" icon="shield"><P i18n="Settings content" /><MenuSubSection value="profile" i18n="Profile"><P i18n="Profile content" /></MenuSubSection><MenuSubSection value="billing" i18n="Billing"><P i18n="Billing content" /></MenuSubSection></MenuSection></Menu>'
            )
        );

        expect(output).toContain('Section menu');
        expect(output).toContain('Overview');
        expect(output).toContain('Settings');
        expect(output).toContain('Overview content');
        expect(output).toContain('text-foreground');
        expect(output).toContain('text-muted-foreground');
        expect(output).not.toContain('Settings content');
        expect(output).not.toContain('Profile content');
    });
});

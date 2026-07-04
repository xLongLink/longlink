import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Menu', () => {
    /* The runtime should render the sidebar menu shell and active panel. */
    it('renders the menu shell in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Menu defaultValue="overview"><MenuSection value="overview" i18n="menu.overview"><P i18n="menu.overviewContent" /></MenuSection><MenuSection value="settings" i18n="menu.settings"><P i18n="menu.settingsContent" /><MenuSubSection value="profile" i18n="menu.profile"><P i18n="menu.profileContent" /></MenuSubSection><MenuSubSection value="billing" i18n="menu.billing"><P i18n="menu.billingContent" /></MenuSubSection></MenuSection></Menu>'
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

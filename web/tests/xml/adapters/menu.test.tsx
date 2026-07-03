import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Menu', () => {
    /* The runtime should render the sidebar menu shell and active panel. */
    it('renders the menu shell in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Menu defaultValue="overview"><MenuSection value="overview" i18n="Overview"><P i18n="Overview content" /></MenuSection><MenuSection value="settings" i18n="Settings"><P i18n="Settings content" /><MenuSubSection value="profile" i18n="Profile"><P i18n="Profile content" /></MenuSubSection><MenuSubSection value="billing" i18n="Billing"><P i18n="Billing content" /></MenuSubSection></MenuSection></Menu>'
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

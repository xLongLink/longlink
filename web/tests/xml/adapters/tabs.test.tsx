import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Tabs', () => {
    /* The runtime should render the shadcn tabs shell and its panels. */
    it('renders the tab composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Tabs defaultValue="overview"><Tab value="overview" i18n="tabs.overview"><P i18n="tabs.overviewPanel" /></Tab><Tab value="settings" i18n="tabs.settings"><P i18n="tabs.settingsPanel" /></Tab></Tabs>'
            )
        );

        expect(output).toContain('Overview');
        expect(output).toContain('Settings');
        expect(output).toContain('Overview panel');
        expect(output).not.toContain('Settings panel');
    });

    /* Missing tab values should fail fast with a tag-specific error. */
    it('throws when a tab value is missing', () => {
        expect(() => renderXmlToMarkup(parseXML('<Tabs><Tab i18n="tabs.overview" /></Tabs>'))).toThrow(
            'Tab requires a string value'
        );
    });
});

import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Tabs', () => {
    /* The compiler should preserve the immediate tab composition. */
    it('preserves the tab structure in compiled xml', () => {
        expect(
            parseXML(
                '<Tabs defaultValue="overview"><Tab value="overview" i18n="Overview" icon="layout-grid"><P i18n="Overview panel" /></Tab><Tab value="settings" i18n="Settings"><P i18n="Settings panel" /></Tab></Tabs>'
            )
        ).toEqual([
            {
                name: 'Tabs',
                params: { defaultValue: 'overview' },
                children: [
                    {
                        name: 'Tab',
                        params: { value: 'overview', i18n: 'Overview', icon: 'layout-grid' },
                        children: [{ name: 'P', params: { i18n: 'Overview panel' }, children: [] }],
                    },
                    {
                        name: 'Tab',
                        params: { value: 'settings', i18n: 'Settings' },
                        children: [{ name: 'P', params: { i18n: 'Settings panel' }, children: [] }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the shadcn tabs shell and its panels. */
    it('renders the tab composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Tabs defaultValue="overview"><Tab value="overview" i18n="Overview" icon="layout-grid"><P i18n="Overview panel" /></Tab><Tab value="settings" i18n="Settings"><P i18n="Settings panel" /></Tab></Tabs>'
            )
        );

        expect(output).toContain('data-slot="tabs"');
        expect(output).toContain('data-slot="tabs-trigger"');
        expect(output).toContain('data-slot="tabs-content"');
        expect(output).toContain('size-4');
        expect(output).toContain('gap-6');
        expect(output).toContain('Overview');
        expect(output).toContain('Settings');
        expect(output).toContain('Overview panel');
        expect(output).not.toContain('Settings panel');
    });

    /* Missing tab values should fail fast with a tag-specific error. */
    it('throws when a tab value is missing', () => {
        expect(() => renderXmlToMarkup(parseXML('<Tabs><Tab i18n="Overview" /></Tabs>'))).toThrow(
            'Tab requires a string value'
        );
    });
});

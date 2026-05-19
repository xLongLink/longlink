import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Tabs', () => {
    /* The compiler should preserve the full tabs composition. */
    it('preserves the compound tabs structure in compiled xml', () => {
        expect(
            parseXML(
                '<Tabs defaultValue="overview"><TabsList variant="line"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList><TabsContent value="overview">Overview panel</TabsContent><TabsContent value="settings">Settings panel</TabsContent></Tabs>'
            )
        ).toEqual([
            {
                name: 'Tabs',
                params: { defaultValue: 'overview' },
                children: [
                    {
                        name: 'TabsList',
                        params: { variant: 'line' },
                        children: [
                            {
                                name: 'TabsTrigger',
                                params: { value: 'overview' },
                                children: [{ name: 'Text', params: { value: 'Overview' } }],
                            },
                            {
                                name: 'TabsTrigger',
                                params: { value: 'settings' },
                                children: [{ name: 'Text', params: { value: 'Settings' } }],
                            },
                        ],
                    },
                    {
                        name: 'TabsContent',
                        params: { value: 'overview' },
                        children: [{ name: 'Text', params: { value: 'Overview panel' } }],
                    },
                    {
                        name: 'TabsContent',
                        params: { value: 'settings' },
                        children: [{ name: 'Text', params: { value: 'Settings panel' } }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the shadcn tabs shell and its slots. */
    it('renders the full tabs composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Tabs defaultValue="overview"><TabsList variant="line"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList><TabsContent value="overview">Overview panel</TabsContent><TabsContent value="settings">Settings panel</TabsContent></Tabs>'
            )
        );

        expect(output).toContain('data-slot="tabs"');
        expect(output).toContain('data-slot="tabs-list"');
        expect(output).toContain('data-slot="tabs-trigger"');
        expect(output).toContain('data-slot="tabs-content"');
        expect(output).toContain('gap-6');
        expect(output).toContain('Overview');
        expect(output).toContain('Settings');
        expect(output).toContain('Overview panel');
        expect(output).not.toContain('Settings panel');
    });

    /* Missing trigger values should fail fast with a tag-specific error. */
    it('throws when a tab trigger value is missing', () => {
        expect(() => renderXmlToMarkup(parseXML('<Tabs><TabsList><TabsTrigger>Overview</TabsTrigger></TabsList></Tabs>'))).toThrow(
            'TabsTrigger requires a string value'
        );
    });
});

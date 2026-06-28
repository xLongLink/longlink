import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Dialog', () => {
    /* The compiler should preserve the full dialog composition. */
    it('preserves the compound dialog structure in compiled xml', () => {
        expect(
            parseXML(
                '<Dialog open="${true}"><DialogTrigger><Button variant="outline"><P i18n="Open dialog" /></Button></DialogTrigger><DialogContent><DialogTitle><P i18n="Delete issue" /></DialogTitle><DialogDescription><P i18n="This cannot be undone." /></DialogDescription><Button i18n="Actions" /></DialogContent></Dialog>'
            )
        ).toEqual([
            {
                name: 'Dialog',
                params: { open: '${true}' },
                children: [
                    {
                        name: 'DialogTrigger',
                        children: [
                            {
                                name: 'Button',
                                params: { variant: 'outline' },
                                children: [{ name: 'P', params: { i18n: 'Open dialog' }, children: [] }],
                            },
                        ],
                    },
                    {
                        name: 'DialogContent',
                        children: [
                            {
                                name: 'DialogTitle',
                                children: [{ name: 'P', params: { i18n: 'Delete issue' }, children: [] }],
                            },
                            {
                                name: 'DialogDescription',
                                children: [{ name: 'P', params: { i18n: 'This cannot be undone.' }, children: [] }],
                            },
                            {
                                name: 'Button',
                                params: { i18n: 'Actions' },
                                children: [],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the trigger; portal content is client-side. */
    it('renders the dialog trigger in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Dialog open="${true}"><DialogTrigger><Button variant="outline"><P i18n="Open dialog" /></Button></DialogTrigger><DialogContent><DialogTitle><P i18n="Delete issue" /></DialogTitle><DialogDescription><P i18n="This cannot be undone." /></DialogDescription><Button i18n="Actions" /></DialogContent></Dialog>'
            )
        );

        expect(output).toContain('data-slot="dialog-trigger"');
        expect(output).toContain('Open dialog');
        expect(output).not.toContain('<button><button');
    });

    /* The runtime should support anchor-style dialog triggers. */
    it('renders an anchor trigger in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Dialog open="${true}"><DialogTrigger><A href="/quotes/edit" active="hover"><P i18n="Edit quote" /></A></DialogTrigger><DialogContent><DialogTitle><P i18n="Edit quote" /></DialogTitle><DialogDescription><P i18n="Review the quote details before saving the next revision." /></DialogDescription><Button i18n="Actions" /></DialogContent></Dialog>'
            )
        );

        expect(output).toContain('data-slot="dialog-trigger"');
        expect(output).toContain(
            'class="inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80"'
        );
        expect(output).toContain('href="/quotes/edit"');
        expect(output).toContain('Edit quote');
    });
});

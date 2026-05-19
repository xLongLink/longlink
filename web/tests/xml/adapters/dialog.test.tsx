import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Dialog', () => {
    /* The compiler should preserve the full dialog composition. */
    it('preserves the compound dialog structure in compiled xml', () => {
        expect(
            parseXML(
                '<Dialog open="${true}"><DialogTrigger><Button variant="outline">Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Delete issue</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader><DialogFooter>Actions</DialogFooter></DialogContent></Dialog>'
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
                                children: [{ name: 'Text', params: { value: 'Open dialog' } }],
                            },
                        ],
                    },
                    {
                        name: 'DialogContent',
                        children: [
                            {
                                name: 'DialogHeader',
                                children: [
                                    {
                                        name: 'DialogTitle',
                                        children: [{ name: 'Text', params: { value: 'Delete issue' } }],
                                    },
                                    {
                                        name: 'DialogDescription',
                                        children: [{ name: 'Text', params: { value: 'This cannot be undone.' } }],
                                    },
                                ],
                            },
                            {
                                name: 'DialogFooter',
                                children: [{ name: 'Text', params: { value: 'Actions' } }],
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
                '<Dialog open="${true}"><DialogTrigger><Button variant="outline">Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Delete issue</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader><DialogFooter>Actions</DialogFooter></DialogContent></Dialog>'
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
                '<Dialog open="${true}"><DialogTrigger><A href="/quotes/edit" active="hover">Edit quote</A></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Edit quote</DialogTitle><DialogDescription>Review the quote details before saving the next revision.</DialogDescription></DialogHeader><DialogFooter>Actions</DialogFooter></DialogContent></Dialog>'
            )
        );

        expect(output).toContain('data-slot="dialog-trigger"');
        expect(output).toContain(
            'class="inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80"',
        );
        expect(output).toContain('href="/quotes/edit"');
        expect(output).toContain('Edit quote');
    });
});

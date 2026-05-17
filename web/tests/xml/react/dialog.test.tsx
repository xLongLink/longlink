import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Dialog', () => {
    /* The compiler should preserve the full dialog composition. */
    it('preserves the compound dialog structure in compiled xml', () => {
        expect(
            parseXML(
                '<Dialog open="{true}"><DialogTrigger><Button variant="outline">Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Delete issue</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader><DialogFooter>Actions</DialogFooter></DialogContent></Dialog>'
            )
        ).toEqual([
            {
                name: 'Dialog',
                params: { open: '{true}' },
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
                '<Dialog open="{true}"><DialogTrigger><Button variant="outline">Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Delete issue</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader><DialogFooter>Actions</DialogFooter></DialogContent></Dialog>'
            )
        );

        expect(output).toContain('data-slot="dialog-trigger"');
        expect(output).toContain('Open dialog');
        expect(output).not.toContain('<button><button');
    });
});

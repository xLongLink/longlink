import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Card', () => {
    /* The parser should preserve the simplified card structure. */
    it('preserves the simplified card structure in compiled xml', () => {
        expect(
            parseXML(
                '<Card><CardContent><CardTitle>Card Title</CardTitle><CardDescription>Card Description</CardDescription><CardAction>Card Action</CardAction><P>Card Content</P></CardContent></Card>'
            )
        ).toEqual([
            {
                name: 'Card',
                children: [
                    {
                        name: 'CardContent',
                        children: [
                            { name: 'CardTitle', children: [{ name: 'Text', params: { value: 'Card Title' } }] },
                            {
                                name: 'CardDescription',
                                children: [{ name: 'Text', params: { value: 'Card Description' } }],
                            },
                            { name: 'CardAction', children: [{ name: 'Text', params: { value: 'Card Action' } }] },
                            {
                                name: 'P',
                                children: [{ name: 'Text', params: { value: 'Card Content' } }],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the shadcn card shell and content slots. */
    it('renders the simplified card composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Card><CardContent><CardTitle>Card Title</CardTitle><CardDescription>Card Description</CardDescription><CardAction>Card Action</CardAction><P>Card Content</P></CardContent></Card>'
            )
        );

        expect(output).toContain('data-slot="card"');
        expect(output).toContain('data-slot="card-title"');
        expect(output).toContain('data-slot="card-description"');
        expect(output).toContain('data-slot="card-action"');
        expect(output).toContain('data-slot="card-content"');
        expect(output).toContain('Card Title');
        expect(output).toContain('Card Description');
        expect(output).toContain('Card Action');
        expect(output).toContain('Card Content');
    });
});

import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Card', () => {
    /* The parser should preserve the full compound card structure. */
    it('preserves the compound card structure in compiled xml', () => {
        expect(
            parseXML(
                '<Card><CardHeader><CardTitle>Card Title</CardTitle><CardDescription>Card Description</CardDescription><CardAction>Card Action</CardAction></CardHeader><CardContent><P>Card Content</P></CardContent><CardFooter><P>Card Footer</P></CardFooter></Card>'
            )
        ).toEqual([
            {
                name: 'Card',
                children: [
                    {
                        name: 'CardHeader',
                        children: [
                            { name: 'CardTitle', children: [{ name: 'Text', params: { value: 'Card Title' } }] },
                            {
                                name: 'CardDescription',
                                children: [{ name: 'Text', params: { value: 'Card Description' } }],
                            },
                            { name: 'CardAction', children: [{ name: 'Text', params: { value: 'Card Action' } }] },
                        ],
                    },
                    {
                        name: 'CardContent',
                        children: [
                            {
                                name: 'P',
                                children: [{ name: 'Text', params: { value: 'Card Content' } }],
                            },
                        ],
                    },
                    {
                        name: 'CardFooter',
                        children: [
                            {
                                name: 'P',
                                children: [{ name: 'Text', params: { value: 'Card Footer' } }],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the shadcn card shell and all slots. */
    it('renders the full card composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Card><CardHeader><CardTitle>Card Title</CardTitle><CardDescription>Card Description</CardDescription><CardAction>Card Action</CardAction></CardHeader><CardContent><P>Card Content</P></CardContent><CardFooter><P>Card Footer</P></CardFooter></Card>'
            )
        );

        expect(output).toContain('data-slot="card"');
        expect(output).toContain('data-slot="card-header"');
        expect(output).toContain('data-slot="card-title"');
        expect(output).toContain('data-slot="card-description"');
        expect(output).toContain('data-slot="card-action"');
        expect(output).toContain('data-slot="card-content"');
        expect(output).toContain('data-slot="card-footer"');
        expect(output).toContain('Card Title');
        expect(output).toContain('Card Description');
        expect(output).toContain('Card Action');
        expect(output).toContain('Card Content');
        expect(output).toContain('Card Footer');
    });
});

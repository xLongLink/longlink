import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Field', () => {
    /* The compiler should preserve the grouped field composition. */
    it('preserves the full field structure in compiled xml', () => {
        expect(
            parseXML(
                '<Grid columns="2"><Field><FieldContent><FieldTitle>Full name</FieldTitle></FieldContent><FieldLabel htmlFor="name">Full name</FieldLabel><Input id="name" autoComplete="off" placeholder="Evil Rabbit" /><FieldDescription>This appears on invoices and emails.</FieldDescription></Field><Field><FieldLabel htmlFor="username">Username</FieldLabel><Input id="username" autoComplete="off" aria-invalid="true" /></Field><Field orientation="horizontal"><Switch id="newsletter" /><FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel></Field></Grid>'
            )
        ).toMatchObject([
            {
                name: 'Grid',
                params: { columns: '2' },
                children: [
                    {
                        name: 'Field',
                        children: [
                            {
                                name: 'FieldContent',
                                children: [
                                    {
                                        name: 'FieldTitle',
                                        children: [{ name: 'Text', params: { value: 'Full name' } }],
                                    },
                                ],
                            },
                            {
                                name: 'FieldLabel',
                                params: { htmlFor: 'name' },
                                children: [{ name: 'Text', params: { value: 'Full name' } }],
                            },
                            {
                                name: 'Input',
                                params: { id: 'name', autoComplete: 'off', placeholder: 'Evil Rabbit' },
                            },
                            {
                                name: 'FieldDescription',
                                children: [{ name: 'Text', params: { value: 'This appears on invoices and emails.' } }],
                            },
                        ],
                    },
                    {
                        name: 'Field',
                        children: [
                            {
                                name: 'FieldLabel',
                                params: { htmlFor: 'username' },
                                children: [{ name: 'Text', params: { value: 'Username' } }],
                            },
                            {
                                name: 'Input',
                                params: { id: 'username', autoComplete: 'off', 'aria-invalid': 'true' },
                            },
                        ],
                    },
                    {
                        name: 'Field',
                        params: { orientation: 'horizontal' },
                        children: [
                            {
                                name: 'Switch',
                                params: { id: 'newsletter' },
                            },
                            {
                                name: 'FieldLabel',
                                params: { htmlFor: 'newsletter' },
                                children: [{ name: 'Text', params: { value: 'Subscribe to the newsletter' } }],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the shadcn field shell and its slots. */
    it('renders the full field composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Grid columns="2"><Field><FieldContent><FieldTitle>Full name</FieldTitle></FieldContent><FieldLabel htmlFor="name">Full name</FieldLabel><Input id="name" autoComplete="off" placeholder="Evil Rabbit" /><FieldDescription>This appears on invoices and emails.</FieldDescription></Field><Field><FieldLabel htmlFor="username">Username</FieldLabel><Input id="username" autoComplete="off" aria-invalid="true" /></Field><Field orientation="horizontal"><Switch id="newsletter" /><FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel></Field></Grid>'
            )
        );

        expect(output).toContain('data-slot="grid"');
        expect(output).toContain('data-slot="field"');
        expect(output).toContain('data-slot="field-content"');
        expect(output).toContain('data-slot="field-label"');
        expect(output).toContain('data-slot="field-description"');
        expect(output).toContain('Full name');
        expect(output).toContain('data-orientation="horizontal"');
    });
});

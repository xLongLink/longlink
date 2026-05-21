import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Field', () => {
    /* The compiler should preserve the grouped field composition. */
    it('preserves the full field structure in compiled xml', () => {
        expect(
            parseXML(
                '<FieldSet><FieldLegend>Profile</FieldLegend><FieldDescription>This appears on invoices and emails.</FieldDescription><Field><FieldContent><FieldTitle>Full name</FieldTitle></FieldContent><FieldLabel htmlFor="name">Full name</FieldLabel><Input id="name" autoComplete="off" placeholder="Evil Rabbit" /><FieldDescription>This appears on invoices and emails.</FieldDescription></Field><Field><FieldLabel htmlFor="username">Username</FieldLabel><Input id="username" autoComplete="off" aria-invalid="true" /><FieldError>Choose another username.</FieldError></Field><Field orientation="horizontal"><Switch id="newsletter" /><FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel></Field><FieldSeparator>or</FieldSeparator></FieldSet>'
            )
        ).toMatchObject([
            {
                name: 'FieldSet',
                children: [
                    {
                        name: 'FieldLegend',
                        children: [{ name: 'Text', params: { value: 'Profile' } }],
                    },
                    {
                        name: 'FieldDescription',
                        children: [{ name: 'Text', params: { value: 'This appears on invoices and emails.' } }],
                    },
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
                            {
                                name: 'FieldError',
                                children: [{ name: 'Text', params: { value: 'Choose another username.' } }],
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
                    {
                        name: 'FieldSeparator',
                        children: [{ name: 'Text', params: { value: 'or' } }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the shadcn field shell and its slots. */
    it('renders the full field composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<FieldSet><FieldLegend>Profile</FieldLegend><FieldDescription>This appears on invoices and emails.</FieldDescription><Field><FieldContent><FieldTitle>Full name</FieldTitle></FieldContent><FieldLabel htmlFor="name">Full name</FieldLabel><Input id="name" autoComplete="off" placeholder="Evil Rabbit" /><FieldDescription>This appears on invoices and emails.</FieldDescription></Field><Field><FieldLabel htmlFor="username">Username</FieldLabel><Input id="username" autoComplete="off" aria-invalid="true" /><FieldError>Choose another username.</FieldError></Field><Field orientation="horizontal"><Switch id="newsletter" /><FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel></Field><FieldSeparator>or</FieldSeparator></FieldSet>'
            )
        );

        expect(output).toContain('data-slot="field-set"');
        expect(output).toContain('data-slot="field-legend"');
        expect(output).toContain('data-slot="field"');
        expect(output).toContain('data-slot="field-content"');
        expect(output).toContain('data-slot="field-label"');
        expect(output).toContain('data-slot="field-description"');
        expect(output).toContain('data-slot="field-error"');
        expect(output).toContain('data-slot="field-separator"');
        expect(output).toContain('Full name');
        expect(output).toContain('Choose another username.');
        expect(output).toContain('data-orientation="horizontal"');
    });
});

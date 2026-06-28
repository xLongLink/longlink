import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Field', () => {
    /* The compiler should preserve the grouped field composition. */
    it('preserves the full field structure in compiled xml', () => {
        expect(
            parseXML(
                '<Grid columns="2"><Field><FieldContent><FieldTitle i18n="Full name" /></FieldContent><FieldLabel htmlFor="name" i18n="Full name" /><Input id="name" autoComplete="off" placeholder="Evil Rabbit" /><FieldDescription i18n="This appears on invoices and emails." /></Field><Field><FieldLabel htmlFor="username" i18n="Username" /><Input id="username" autoComplete="off" aria-invalid="true" /></Field><Field orientation="horizontal"><Switch id="newsletter" /><FieldLabel htmlFor="newsletter" i18n="Subscribe to the newsletter" /></Field></Grid>'
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
                                        params: { i18n: 'Full name' },
                                        children: [],
                                    },
                                ],
                            },
                            {
                                name: 'FieldLabel',
                                params: { htmlFor: 'name', i18n: 'Full name' },
                                children: [],
                            },
                            {
                                name: 'Input',
                                params: { id: 'name', autoComplete: 'off', placeholder: 'Evil Rabbit' },
                            },
                            {
                                name: 'FieldDescription',
                                params: { i18n: 'This appears on invoices and emails.' },
                                children: [],
                            },
                        ],
                    },
                    {
                        name: 'Field',
                        children: [
                            {
                                name: 'FieldLabel',
                                params: { htmlFor: 'username', i18n: 'Username' },
                                children: [],
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
                                params: { htmlFor: 'newsletter', i18n: 'Subscribe to the newsletter' },
                                children: [],
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
                '<Grid columns="2"><Field><FieldContent><FieldTitle i18n="Full name" /></FieldContent><FieldLabel htmlFor="name" i18n="Full name" /><Input id="name" autoComplete="off" placeholder="Evil Rabbit" /><FieldDescription i18n="This appears on invoices and emails." /></Field><Field><FieldLabel htmlFor="username" i18n="Username" /><Input id="username" autoComplete="off" aria-invalid="true" /></Field><Field orientation="horizontal"><Switch id="newsletter" /><FieldLabel htmlFor="newsletter" i18n="Subscribe to the newsletter" /></Field></Grid>'
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

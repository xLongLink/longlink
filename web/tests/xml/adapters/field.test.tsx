import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Field', () => {
    /* The runtime should render the shadcn field shell and its slots. */
    it('renders the full field composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Grid columns="2"><Field><FieldContent><FieldTitle i18n="Full name" /></FieldContent><FieldLabel htmlFor="name" i18n="Full name" /><Input id="name" autoComplete="off" placeholder="Evil Rabbit" /><FieldDescription i18n="This appears on invoices and emails." /></Field><Field><FieldLabel htmlFor="username" i18n="Username" /><Input id="username" autoComplete="off" aria-invalid="true" /></Field><Field orientation="horizontal"><Switch id="newsletter" /><FieldLabel htmlFor="newsletter" i18n="Subscribe to the newsletter" /></Field></Grid>'
            )
        );

        expect(output).toContain('Full name');
        expect(output).toContain('Subscribe to the newsletter');
    });
});

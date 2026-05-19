import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Longlink', () => {
    /* The root shell should match the default page spacing contract. */
    it('renders the longlink shell with default page gap', () => {
        const output = renderXmlToMarkup(parseXML('<longlink><P>One</P><P>Two</P></longlink>'));

        expect(output).toContain('class="flex flex-col gap-6 text-sm"');
        expect(output).toContain('One');
        expect(output).toContain('Two');
    });
});

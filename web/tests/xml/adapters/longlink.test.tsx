import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Longlink', () => {
    /* The root shell should match the default page spacing contract. */
    it('renders the longlink shell with default page gap', () => {
        const output = renderXmlToMarkup(parseXML('<longlink><P i18n="One" /><P i18n="Two" /></longlink>'));

        expect(output).toContain('class="flex flex-col gap-6 text-sm"');
        expect(output).toContain('One');
        expect(output).toContain('Two');
    });

    it('allows name and icon metadata props on longlink', () => {
        const output = renderXmlToMarkup(
            parseXML('<longlink name="Dashboard" icon="layout-dashboard"><P i18n="One" /></longlink>')
        );

        expect(output).toContain('One');
    });

    it('rejects unknown longlink attributes at runtime', () => {
        expect(() => renderXmlToMarkup(parseXML('<longlink hidden="true"><P i18n="One" /></longlink>'))).toThrow(
            'Unsupported longlink attributes: hidden'
        );
    });
});

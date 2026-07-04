import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Longlink', () => {
    it('renders longlink children', () => {
        const output = renderXmlToMarkup(
            parseXML('<longlink><P i18n="longlink.one" /><P i18n="longlink.two" /></longlink>')
        );

        expect(output).toContain('One');
        expect(output).toContain('Two');
    });

    it('allows name metadata props on longlink', () => {
        const output = renderXmlToMarkup(
            parseXML('<longlink name="Dashboard"><P i18n="longlink.one" /></longlink>')
        );

        expect(output).toContain('One');
    });

    it('rejects unknown longlink attributes at runtime', () => {
        expect(() => renderXmlToMarkup(parseXML('<longlink hidden="true"><P i18n="longlink.one" /></longlink>'))).toThrow(
            'Unsupported longlink attributes: hidden'
        );
    });
});

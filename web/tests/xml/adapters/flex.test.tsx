import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Flex', () => {
    it('renders flex spacing variants', () => {
        const center = renderXmlToMarkup(parseXML('<Flex space="center"><P i18n="One" /><P i18n="Two" /></Flex>'));
        const around = renderXmlToMarkup(parseXML('<Flex space="around"><P i18n="One" /><P i18n="Two" /></Flex>'));
        const between = renderXmlToMarkup(parseXML('<Flex space="between"><P i18n="One" /><P i18n="Two" /></Flex>'));
        const evenly = renderXmlToMarkup(parseXML('<Flex space="evenly"><P i18n="One" /><P i18n="Two" /></Flex>'));

        expect(center).toContain('data-slot="flex"');
        expect(center).toContain('justify-center');
        expect(around).toContain('justify-around');
        expect(between).toContain('justify-between');
        expect(evenly).toContain('justify-evenly');
    });
});

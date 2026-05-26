import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Flex', () => {
    it('renders flex spacing variants', () => {
        const center = renderXmlToMarkup(parseXML('<Flex space="center"><P>One</P><P>Two</P></Flex>'));
        const around = renderXmlToMarkup(parseXML('<Flex space="around"><P>One</P><P>Two</P></Flex>'));
        const between = renderXmlToMarkup(parseXML('<Flex space="between"><P>One</P><P>Two</P></Flex>'));
        const evenly = renderXmlToMarkup(parseXML('<Flex space="evenly"><P>One</P><P>Two</P></Flex>'));

        expect(center).toContain('data-slot="flex"');
        expect(center).toContain('justify-center');
        expect(around).toContain('justify-around');
        expect(between).toContain('justify-between');
        expect(evenly).toContain('justify-evenly');
    });
});

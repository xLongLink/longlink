import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Table', () => {
    /* The runtime should render the shadcn table shell and its slots. */
    it('renders the full table composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Table><Thead><Tr><Th i18n="Quarter" /><Th i18n="Revenue" /><Th i18n="Growth" /><Th i18n="Status" /></Tr></Thead><Tbody><Tr><Td i18n="Q1" /><Td i18n="$120k" /><Td i18n="12%" /><Td i18n="On track" /></Tr><Tr><Td i18n="Q2" /><Td i18n="$154k" /><Td i18n="28%" /><Td i18n="On track" /></Tr></Tbody><Tfoot><Tr><Td i18n="Total" /><Td i18n="$274k" /><Td i18n="20%" /><Td i18n="Projected" /></Tr></Tfoot></Table>'
            )
        );

        expect(output).toContain('Q1');
        expect(output).toContain('$154k');
        expect(output).toContain('Projected');
    });

    /* The runtime should render expression values without requiring translation keys. */
    it('renders direct table cell values', () => {
        const output = renderXmlToMarkup(
            parseXML('<Table><Tbody><Tr><Td value="${\'SKU-001\'}" /><Td value="${10}" /></Tr></Tbody></Table>')
        );

        expect(output).toContain('SKU-001');
        expect(output).toContain('10');
    });
});

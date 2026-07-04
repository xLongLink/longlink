import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Table', () => {
    /* The runtime should render the shadcn table shell and its slots. */
    it('renders the full table composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Table><Thead><Tr><Th i18n="table.quarter" /><Th i18n="table.revenue" /><Th i18n="table.growth" /><Th i18n="table.status" /></Tr></Thead><Tbody><Tr><Td i18n="table.q1" /><Td i18n="table.revenueQ1" /><Td i18n="table.twelvePercent" /><Td i18n="table.onTrack" /></Tr><Tr><Td i18n="table.q2" /><Td i18n="table.revenueQ2" /><Td i18n="table.twentyEightPercent" /><Td i18n="table.onTrack" /></Tr></Tbody><Tfoot><Tr><Td i18n="table.total" /><Td i18n="table.totalRevenue" /><Td i18n="table.totalGrowth" /><Td i18n="table.projected" /></Tr></Tfoot></Table>'
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

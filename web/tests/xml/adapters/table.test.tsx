import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Table', () => {
    /* The compiler should preserve the full table composition. */
    it('preserves the compound table structure in compiled xml', () => {
        expect(
            parseXML(
                '<Table><Thead><Tr><Th i18n="Quarter" /><Th i18n="Revenue" /><Th i18n="Growth" /><Th i18n="Status" /></Tr></Thead><Tbody><Tr><Td i18n="Q1" /><Td i18n="$120k" /><Td i18n="12%" /><Td i18n="On track" /></Tr><Tr><Td i18n="Q2" /><Td i18n="$154k" /><Td i18n="28%" /><Td i18n="On track" /></Tr></Tbody><Tfoot><Tr><Td i18n="Total" /><Td i18n="$274k" /><Td i18n="20%" /><Td i18n="Projected" /></Tr></Tfoot></Table>'
            )
        ).toEqual([
            {
                name: 'Table',
                children: [
                    {
                        name: 'Thead',
                        children: [
                            {
                                name: 'Tr',
                                children: [
                                    { name: 'Th', params: { i18n: 'Quarter' }, children: [] },
                                    { name: 'Th', params: { i18n: 'Revenue' }, children: [] },
                                    { name: 'Th', params: { i18n: 'Growth' }, children: [] },
                                    { name: 'Th', params: { i18n: 'Status' }, children: [] },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'Tbody',
                        children: [
                            {
                                name: 'Tr',
                                children: [
                                    { name: 'Td', params: { i18n: 'Q1' }, children: [] },
                                    { name: 'Td', params: { i18n: '$120k' }, children: [] },
                                    { name: 'Td', params: { i18n: '12%' }, children: [] },
                                    { name: 'Td', params: { i18n: 'On track' }, children: [] },
                                ],
                            },
                            {
                                name: 'Tr',
                                children: [
                                    { name: 'Td', params: { i18n: 'Q2' }, children: [] },
                                    { name: 'Td', params: { i18n: '$154k' }, children: [] },
                                    { name: 'Td', params: { i18n: '28%' }, children: [] },
                                    { name: 'Td', params: { i18n: 'On track' }, children: [] },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'Tfoot',
                        children: [
                            {
                                name: 'Tr',
                                children: [
                                    { name: 'Td', params: { i18n: 'Total' }, children: [] },
                                    { name: 'Td', params: { i18n: '$274k' }, children: [] },
                                    { name: 'Td', params: { i18n: '20%' }, children: [] },
                                    { name: 'Td', params: { i18n: 'Projected' }, children: [] },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the shadcn table shell and its slots. */
    it('renders the full table composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Table><Thead><Tr><Th i18n="Quarter" /><Th i18n="Revenue" /><Th i18n="Growth" /><Th i18n="Status" /></Tr></Thead><Tbody><Tr><Td i18n="Q1" /><Td i18n="$120k" /><Td i18n="12%" /><Td i18n="On track" /></Tr><Tr><Td i18n="Q2" /><Td i18n="$154k" /><Td i18n="28%" /><Td i18n="On track" /></Tr></Tbody><Tfoot><Tr><Td i18n="Total" /><Td i18n="$274k" /><Td i18n="20%" /><Td i18n="Projected" /></Tr></Tfoot></Table>'
            )
        );

        expect(output).toContain('data-slot="table-container"');
        expect(output).toContain('data-slot="table"');
        expect(output).toContain('data-slot="table-header"');
        expect(output).toContain('data-slot="table-body"');
        expect(output).toContain('data-slot="table-footer"');
        expect(output).toContain('data-slot="table-row"');
        expect(output).toContain('data-slot="table-head"');
        expect(output).toContain('data-slot="table-cell"');
        expect(output).toContain('Q1');
        expect(output).toContain('$154k');
        expect(output).toContain('Projected');
        expect(output).toContain('text-sm');
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

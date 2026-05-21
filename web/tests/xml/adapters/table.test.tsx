import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Table', () => {
    /* The compiler should preserve the full table composition. */
    it('preserves the compound table structure in compiled xml', () => {
        expect(
            parseXML(
                '<Table><Thead><Tr><Th>Quarter</Th><Th>Revenue</Th><Th>Growth</Th><Th>Status</Th></Tr></Thead><Tbody><Tr><Td>Q1</Td><Td>$120k</Td><Td>12%</Td><Td>On track</Td></Tr><Tr><Td>Q2</Td><Td>$154k</Td><Td>28%</Td><Td>On track</Td></Tr></Tbody><Tfoot><Tr><Td>Total</Td><Td>$274k</Td><Td>20%</Td><Td>Projected</Td></Tr></Tfoot></Table>'
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
                                    { name: 'Th', children: [{ name: 'Text', params: { value: 'Quarter' } }] },
                                    { name: 'Th', children: [{ name: 'Text', params: { value: 'Revenue' } }] },
                                    { name: 'Th', children: [{ name: 'Text', params: { value: 'Growth' } }] },
                                    { name: 'Th', children: [{ name: 'Text', params: { value: 'Status' } }] },
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
                                    { name: 'Td', children: [{ name: 'Text', params: { value: 'Q1' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: '$120k' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: '12%' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: 'On track' } }] },
                                ],
                            },
                            {
                                name: 'Tr',
                                children: [
                                    { name: 'Td', children: [{ name: 'Text', params: { value: 'Q2' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: '$154k' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: '28%' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: 'On track' } }] },
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
                                    { name: 'Td', children: [{ name: 'Text', params: { value: 'Total' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: '$274k' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: '20%' } }] },
                                    { name: 'Td', children: [{ name: 'Text', params: { value: 'Projected' } }] },
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
                '<Table><Thead><Tr><Th>Quarter</Th><Th>Revenue</Th><Th>Growth</Th><Th>Status</Th></Tr></Thead><Tbody><Tr><Td>Q1</Td><Td>$120k</Td><Td>12%</Td><Td>On track</Td></Tr><Tr><Td>Q2</Td><Td>$154k</Td><Td>28%</Td><Td>On track</Td></Tr></Tbody><Tfoot><Tr><Td>Total</Td><Td>$274k</Td><Td>20%</Td><Td>Projected</Td></Tr></Tfoot></Table>'
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
});

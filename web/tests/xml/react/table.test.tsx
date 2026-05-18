import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Table', () => {
    /* The compiler should preserve the full table composition. */
    it('preserves the compound table structure in compiled xml', () => {
        expect(
            parseXML(
                '<Table><TableCaption>Revenue by quarter</TableCaption><TableHeader><TableRow><TableHead>Quarter</TableHead><TableHead>Revenue</TableHead><TableHead>Growth</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Q1</TableCell><TableCell>$120k</TableCell><TableCell>12%</TableCell><TableCell>On track</TableCell></TableRow><TableRow><TableCell>Q2</TableCell><TableCell>$154k</TableCell><TableCell>28%</TableCell><TableCell>On track</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>Total</TableCell><TableCell>$274k</TableCell><TableCell>20%</TableCell><TableCell>Projected</TableCell></TableRow></TableFooter></Table>'
            )
        ).toEqual([
            {
                name: 'Table',
                children: [
                    {
                        name: 'TableCaption',
                        children: [{ name: 'Text', params: { value: 'Revenue by quarter' } }],
                    },
                    {
                        name: 'TableHeader',
                        children: [
                            {
                                name: 'TableRow',
                                children: [
                                    { name: 'TableHead', children: [{ name: 'Text', params: { value: 'Quarter' } }] },
                                    { name: 'TableHead', children: [{ name: 'Text', params: { value: 'Revenue' } }] },
                                    { name: 'TableHead', children: [{ name: 'Text', params: { value: 'Growth' } }] },
                                    { name: 'TableHead', children: [{ name: 'Text', params: { value: 'Status' } }] },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'TableBody',
                        children: [
                            {
                                name: 'TableRow',
                                children: [
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: 'Q1' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: '$120k' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: '12%' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: 'On track' } }] },
                                ],
                            },
                            {
                                name: 'TableRow',
                                children: [
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: 'Q2' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: '$154k' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: '28%' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: 'On track' } }] },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'TableFooter',
                        children: [
                            {
                                name: 'TableRow',
                                children: [
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: 'Total' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: '$274k' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: '20%' } }] },
                                    { name: 'TableCell', children: [{ name: 'Text', params: { value: 'Projected' } }] },
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
                '<Table><TableCaption>Revenue by quarter</TableCaption><TableHeader><TableRow><TableHead>Quarter</TableHead><TableHead>Revenue</TableHead><TableHead>Growth</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Q1</TableCell><TableCell>$120k</TableCell><TableCell>12%</TableCell><TableCell>On track</TableCell></TableRow><TableRow><TableCell>Q2</TableCell><TableCell>$154k</TableCell><TableCell>28%</TableCell><TableCell>On track</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>Total</TableCell><TableCell>$274k</TableCell><TableCell>20%</TableCell><TableCell>Projected</TableCell></TableRow></TableFooter></Table>'
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
        expect(output).toContain('data-slot="table-caption"');
        expect(output).toContain('Revenue by quarter');
        expect(output).toContain('Q1');
        expect(output).toContain('$154k');
        expect(output).toContain('Projected');
        expect(output).toContain('text-sm');
    });
});

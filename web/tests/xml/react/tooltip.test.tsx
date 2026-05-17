import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Tooltip', () => {
    /* The compiler should preserve the provider, trigger, and content slots. */
    it('preserves the compound tooltip structure in compiled xml', () => {
        expect(
            parseXML(
                '<TooltipProvider><Tooltip open="{true}"><TooltipTrigger>Hover me</TooltipTrigger><TooltipContent side="right">Tooltip text</TooltipContent></Tooltip></TooltipProvider>'
            )
        ).toEqual([
            {
                name: 'TooltipProvider',
                children: [
                    {
                        name: 'Tooltip',
                        params: { open: '{true}' },
                        children: [
                            {
                                name: 'TooltipTrigger',
                                children: [{ name: 'Text', params: { value: 'Hover me' } }],
                            },
                            {
                                name: 'TooltipContent',
                                params: { side: 'right' },
                                children: [{ name: 'Text', params: { value: 'Tooltip text' } }],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the tooltip shell and trigger markup. */
    it('renders the tooltip provider and trigger in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<TooltipProvider><Tooltip open="{true}"><TooltipTrigger>Hover me</TooltipTrigger><TooltipContent side="right">Tooltip text</TooltipContent></Tooltip></TooltipProvider>'
            )
        );

        expect(output).toContain('data-slot="tooltip-trigger"');
        expect(output).toContain('Hover me');
    });
});

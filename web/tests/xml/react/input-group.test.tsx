import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('InputGroup', () => {
    /* The compiler should preserve the grouped input structure. */
    it('preserves the input group xml structure', () => {
        expect(
            parseXML(
                '<InputGroup><InputGroupAddon><Icon name="search" /></InputGroupAddon><InputGroupInput label="Handle" value="user.handle" /><InputGroupButton>Search <Icon name="arrow-right" /></InputGroupButton><InputGroupText>Public</InputGroupText></InputGroup>'
            )
        ).toEqual([
            {
                name: 'InputGroup',
                children: [
                    {
                        name: 'InputGroupAddon',
                        children: [{ name: 'Icon', params: { name: 'search' }, children: [] }],
                    },
                    {
                        name: 'InputGroupInput',
                        params: { label: 'Handle', value: 'user.handle' },
                        children: [],
                    },
                    {
                        name: 'InputGroupButton',
                        children: [
                            { name: 'Text', params: { value: 'Search ' } },
                            { name: 'Icon', params: { name: 'arrow-right' }, children: [] },
                        ],
                    },
                    {
                        name: 'InputGroupText',
                        children: [{ name: 'Text', params: { value: 'Public' } }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the grouped control shell end to end. */
    it('renders input group markup end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {}, user: { handle: 'ada' } };
        const output = renderXmlToMarkup(
            parseXML(
                '<InputGroup><InputGroupAddon><Icon name="search" /></InputGroupAddon><InputGroupInput value="user.handle" placeholder="Handle" /><InputGroupButton>Search <Icon name="arrow-right" /></InputGroupButton><InputGroupText>Public</InputGroupText></InputGroup>'
            ),
            ctx
        );

        expect(output).toContain('data-slot="input-group"');
        expect(output).toContain('data-slot="input-group-addon"');
        expect(output).toContain('data-slot="input-group-control"');
        expect(output).toContain('data-slot="input-group-text"');
        expect(output).toContain('Search');
        expect(output).toContain('Public');
        expect(output).toContain('ada');
        expect(output).toContain('<svg');
    });

    /* The runtime should render the textarea variant inside the same shell. */
    it('renders input group textarea markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML('<InputGroup><InputGroupTextarea label="Notes" value="Draft notes" rows="4" /></InputGroup>')
        );

        expect(output).toContain('data-slot="input-group"');
        expect(output).toContain('Draft notes');
        expect(output).toContain('textarea');
    });
});

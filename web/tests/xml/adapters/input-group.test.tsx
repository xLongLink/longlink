import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { proxy } from 'valtio';
import { renderXmlToMarkup } from '../helpers';

describe('InputGroup', () => {
    /* The runtime should render the grouped control shell end to end. */
    it('renders input group markup end to end', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {}, user: { handle: 'ada' } };
        const output = renderXmlToMarkup(
            parseXML(
                '<InputGroup><InputGroupAddon><P i18n="@" /></InputGroupAddon><InputGroupInput value="user.handle" placeholder="Handle" /><InputGroupButton i18n="Search" /><InputGroupText i18n="Public" /></InputGroup>'
            ),
            ctx
        );

        expect(output).toContain('@');
        expect(output).toContain('Search');
        expect(output).toContain('Public');
        expect(output).toContain('ada');
    });

    /* Dotted state bindings should resolve and render the current field value. */
    it('renders dotted value bindings', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: { gridSearch: proxy({ value: 'Revenue' }) },
        };

        const output = renderXmlToMarkup(
            parseXML('<InputGroup><InputGroupInput value="$gridSearch.value" /></InputGroup>'),
            ctx
        );

        expect(output).toContain('value="Revenue"');
    });

    /* The runtime should render the textarea variant inside the same shell. */
    it('renders input group textarea markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML('<InputGroup><InputGroupTextarea label="Notes" value="Draft notes" rows="4" /></InputGroup>')
        );

        expect(output).toContain('Draft notes');
        expect(output).toContain('textarea');
    });
});

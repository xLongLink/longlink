import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { proxy } from 'valtio';
import { renderXmlToMarkup } from '../helpers';

describe('InputGroup', () => {
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
});

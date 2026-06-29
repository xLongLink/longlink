import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Li', () => {
    /* The runtime should render expression values without requiring translation keys. */
    it('renders direct list item values', () => {
        const output = renderXmlToMarkup(parseXML('<Ul><Li value="${\'Apples - Qty: 1 - $2.40\'}" /></Ul>'));

        expect(output).toContain('Apples - Qty: 1 - $2.40');
    });
});

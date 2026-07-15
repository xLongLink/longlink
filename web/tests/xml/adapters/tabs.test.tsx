import { describe, expect, it } from 'bun:test';
import { parseXML } from '@/xml/core/parser';
import { renderXmlToMarkup } from '../helpers';

describe('Tabs', () => {
    /* Missing tab values should fail fast with a tag-specific error. */
    it('throws when a tab value is missing', () => {
        expect(() => renderXmlToMarkup(parseXML('<Tabs><Tab label="Overview" /></Tabs>'))).toThrow(
            'Tab requires a string value'
        );
    });
});

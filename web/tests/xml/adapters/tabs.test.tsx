import { describe, expect, it } from 'bun:test';
import { parseXML } from '@/xml/core/parser';
import { renderXmlToMarkup } from '../helpers';

describe('TabList', () => {
    /* Missing tab values should fail fast with a tag-specific error. */
    it('throws when a tab value is missing', () => {
        expect(() => renderXmlToMarkup(parseXML('<TabList><Tab label="Overview" /></TabList>'))).toThrow(
            'Tab requires a string value'
        );
    });
});

import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('RadioGroup', () => {
    /* Missing item values should fail fast with a tag-specific error. */
    it('throws when a radio group item value is missing', () => {
        expect(() =>
            renderXmlToMarkup(parseXML('<RadioGroup name="priority"><RadioGroupItem i18n="radio.low" /></RadioGroup>'))
        ).toThrow('RadioGroupItem requires a string value');
    });
});

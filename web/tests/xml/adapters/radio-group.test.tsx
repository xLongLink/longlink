import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('RadioGroup', () => {
    /* The runtime should render each radio item and its label inline. */
    it('renders radio group item markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<RadioGroup name="priority" defaultValue="medium"><RadioGroupItem value="low" i18n="radio.low" /><RadioGroupItem value="medium" i18n="radio.medium" /><RadioGroupItem value="high" i18n="radio.high" /></RadioGroup>'
            )
        );

        expect(output).toContain('Low');
        expect(output).toContain('Medium');
        expect(output).toContain('High');
    });

    /* Missing item values should fail fast with a tag-specific error. */
    it('throws when a radio group item value is missing', () => {
        expect(() =>
            renderXmlToMarkup(parseXML('<RadioGroup name="priority"><RadioGroupItem i18n="radio.low" /></RadioGroup>'))
        ).toThrow('RadioGroupItem requires a string value');
    });
});

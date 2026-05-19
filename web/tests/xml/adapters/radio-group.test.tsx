import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('RadioGroup', () => {
    /* The compiler should preserve radio group item text children. */
    it('compiles radio group xml into the expected ast', () => {
        expect(
            parseXML(
                '<RadioGroup name="priority" defaultValue="medium"><RadioGroupItem value="low">Low</RadioGroupItem></RadioGroup>'
            )
        ).toEqual([
            {
                name: 'RadioGroup',
                params: { defaultValue: 'medium', name: 'priority' },
                children: [
                    {
                        name: 'RadioGroupItem',
                        params: { value: 'low' },
                        children: [{ name: 'Text', params: { value: 'Low' } }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render each radio item and its label inline. */
    it('renders radio group item markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<RadioGroup name="priority" defaultValue="medium"><RadioGroupItem value="low">Low</RadioGroupItem><RadioGroupItem value="medium">Medium</RadioGroupItem><RadioGroupItem value="high">High</RadioGroupItem></RadioGroup>'
            )
        );

        expect(output).toContain('data-slot="radio-group"');
        expect(output).toContain('data-slot="radio-group-item"');
        expect(output).toContain('class="inline-flex items-center gap-2"');
        expect(output).toContain('Low');
        expect(output).toContain('Medium');
        expect(output).toContain('High');
    });

    /* Missing item values should fail fast with a tag-specific error. */
    it('throws when a radio group item value is missing', () => {
        expect(() => renderXmlToMarkup(parseXML('<RadioGroup name="priority"><RadioGroupItem>Low</RadioGroupItem></RadioGroup>'))).toThrow(
            'RadioGroupItem requires a string value'
        );
    });
});

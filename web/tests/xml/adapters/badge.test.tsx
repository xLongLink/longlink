import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('Badge', () => {
    it('renders an explicit icon slot without forwarding the slot attribute', () => {
        const output = renderXmlToMarkup(
            parseXML('<Badge><Text value="Active" /><Icon slot="icon" icon="check" /></Badge>')
        );

        expect(output).toContain('svg');
        expect(output).not.toContain('slot=');
    });

    it('keeps direct icon children as the unambiguous icon slot', () => {
        const output = renderXmlToMarkup(parseXML('<Badge><Text value="Active" /><Icon icon="check" /></Badge>'));

        expect(output).toContain('svg');
    });

    it('rejects unsupported slot names, child tags, and duplicate icons', () => {
        expect(() =>
            renderXmlToMarkup(parseXML('<Badge><Text value="Active" /><Icon slot="endContent" icon="check" /></Badge>'))
        ).toThrow('Badge does not support the endContent slot');
        expect(() =>
            renderXmlToMarkup(parseXML('<Badge><Text value="Active" /><Icon icon="check" /><Icon icon="x" /></Badge>'))
        ).toThrow('Badge icon slot accepts one child');
    });
});

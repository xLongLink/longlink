import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/runtimes/0.3/core/parser';
import { renderXmlToMarkup } from '../helpers';

describe('Badge', () => {
    /* A badge's sole visual child is its Astryx icon slot. */
    it('renders an explicit icon slot without forwarding the slot attribute', () => {
        const output = renderXmlToMarkup(parseXML('<Badge label="Active"><Icon slot="icon" icon="check" /></Badge>'));

        expect(output).toContain('svg');
        expect(output).not.toContain('slot=');
    });

    it('keeps direct icon children as the unambiguous icon slot', () => {
        const output = renderXmlToMarkup(parseXML('<Badge label="Active"><Icon icon="check" /></Badge>'));

        expect(output).toContain('svg');
    });

    it('rejects unsupported slot names, child tags, and duplicate icons', () => {
        expect(() =>
            renderXmlToMarkup(parseXML('<Badge label="Active"><Icon slot="endContent" icon="check" /></Badge>'))
        ).toThrow('Badge does not support the endContent slot');
        expect(() => renderXmlToMarkup(parseXML('<Badge label="Active"><Text value="Active" /></Badge>'))).toThrow(
            'Badge icon slot only supports Icon'
        );
        expect(() =>
            renderXmlToMarkup(parseXML('<Badge label="Active"><Icon icon="check" /><Icon icon="x" /></Badge>'))
        ).toThrow('Badge icon slot accepts one child');
    });
});

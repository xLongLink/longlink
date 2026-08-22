import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('Badge', () => {
    it('renders direct icon content', () => {
        const output = renderXmlToMarkup(parseXML('<Badge>Active<Icon icon="check" label="Confirmed" /></Badge>'));

        expect(output).toContain('Active');
        expect(output).toContain('Confirmed');
    });

    it('rejects duplicate icons', () => {
        expect(() =>
            renderXmlToMarkup(parseXML('<Badge>Active<Icon icon="check" /><Icon icon="x" /></Badge>'))
        ).toThrow('Badge accepts one Icon child');
    });
});

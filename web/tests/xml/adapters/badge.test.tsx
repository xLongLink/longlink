import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('Badge', () => {
    it('renders a direct Icon child', () => {
        const output = renderXmlToMarkup(parseXML('<Badge>Active<Icon icon="check" /></Badge>'));

        expect(output).toContain('svg');
    });

    it('rejects duplicate icons', () => {
        expect(() =>
            renderXmlToMarkup(parseXML('<Badge>Active<Icon icon="check" /><Icon icon="x" /></Badge>'))
        ).toThrow('Badge accepts one Icon child');
    });
});

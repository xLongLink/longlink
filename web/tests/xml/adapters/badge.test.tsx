import { describe, expect, it } from 'vitest';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('Badge', () => {
    it('renders direct icon content', () => {
        const output = renderXmlToMarkup(parseFragment('<Badge>Active<Icon icon="check" label="Confirmed" /></Badge>'));

        expect(output).toContain('Active');
        expect(output).toContain('Confirmed');
    });

    it('rejects duplicate icons', () => {
        expect(() =>
            renderXmlToMarkup(parseFragment('<Badge>Active<Icon icon="check" /><Icon icon="x" /></Badge>'))
        ).toThrow('Badge accepts one Icon child');
    });
});

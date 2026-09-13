import { describe, expect, it } from 'vitest';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('Slider', () => {
    it('renders a string-backed XML value at its configured number', () => {
        // Arrange and act
        const markup = renderXmlToMarkup(parseFragment('<Slider label="Progress" value="50" />'));

        // Assert
        expect(markup).toContain('aria-valuenow="50"');
    });
});

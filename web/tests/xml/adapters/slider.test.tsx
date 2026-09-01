import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('Slider', () => {
    it('renders a string-backed XML value at its configured number', () => {
        // Arrange and act
        const markup = renderXmlToMarkup(parseXML('<Slider label="Progress" value="50" />'));

        // Assert
        expect(markup).toContain('aria-valuenow="50"');
    });
});

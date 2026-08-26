import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('Tabs', () => {
    it('rejects markup without a visible Tab', () => {
        expect(() => renderXmlToMarkup(parseXML('<Tabs />'))).toThrow('Tabs requires at least one Tab');
    });

    it('renders a visible Tab', () => {
        expect(renderXmlToMarkup(parseXML('<Tabs><Tab label="Details" value="details">Details</Tab></Tabs>'))).toContain(
            'Details'
        );
    });
});

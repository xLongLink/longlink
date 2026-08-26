import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('Menu', () => {
    it.each([
        ['<Menu><MenuItem label="Home" /></Menu>', 'Menu only supports MenuSection children'],
        [
            '<Menu><MenuSection title="Workspace"><MenuSubSection label="Projects"><Text>Invalid</Text></MenuSubSection></MenuSection></Menu>',
            'MenuSubSection only supports MenuItem children',
        ],
        [
            '<Menu><MenuSection title="Workspace"><Text label="Invalid">Invalid</Text></MenuSection></Menu>',
            'MenuSection does not support Text children',
        ],
    ])('rejects invalid structure', (xml, error) => {
        expect(() => renderXmlToMarkup(parseXML(xml))).toThrow(error);
    });
});

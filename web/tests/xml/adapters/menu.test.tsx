import { RenderXML } from '@/xml/renderers';
import { MemoryRouter } from 'react-router';
import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';
import { createContext } from '@/xml/core/context';
import { renderToStaticMarkup } from 'react-dom/server';

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

    it('renders sections, items, and subsections', () => {
        const ast = parseXML(
            '<longlink><Menu><MenuSection title="Workspace"><MenuItem label="Overview">Overview content</MenuItem><MenuSubSection label="Projects"><MenuItem label="Active projects">Projects content</MenuItem></MenuSubSection></MenuSection></Menu></longlink>'
        )[0];
        const output = renderToStaticMarkup(
            <MemoryRouter>
                <RenderXML ast={ast} ctx={createContext()} />
            </MemoryRouter>
        );

        expect(output).toContain('Workspace');
        expect(output).toContain('Overview');
        expect(output).toContain('Projects');
        expect(output).toContain('Active projects');
        expect(output).toContain('Overview content');
    });
});

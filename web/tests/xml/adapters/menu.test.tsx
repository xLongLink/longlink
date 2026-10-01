import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createContext, parseFragment, RenderXML, renderXmlToMarkup } from '../helpers';

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
        expect(() => renderXmlToMarkup(parseFragment(xml))).toThrow(error);
    });

    it('renders sections, items, and subsections', () => {
        const children = parseFragment(
            '<Menu><MenuSection title="Workspace"><MenuItem label="Overview">Overview content</MenuItem><MenuSubSection label="Projects"><MenuItem label="Active projects">Current work</MenuItem></MenuSubSection></MenuSection></Menu>'
        );
        const output = renderToStaticMarkup(
            <MemoryRouter>
                <RenderXML ast={{ name: 'view', params: {}, children }} ctx={createContext()} />
            </MemoryRouter>
        );

        expect(output).toContain('Workspace');
        expect(output).toContain('Projects');
        expect(output).toContain('Active projects');
        expect(output).toContain('Overview content');
    });
});

import { fromXml, RenderXML } from '@/xml';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('XML Docs', () => {
    it('renders a heading with auto-generated anchor link', () => {
        const ast = fromXml('<H1>Layout</H1>');
        const output = renderToStaticMarkup(createElement(RenderXML, { ast }));

        expect(output).toContain('href="#layout"');
        expect(output).toContain('-translate-x-7');
        expect(output).toContain('Link to this heading');
    });
});

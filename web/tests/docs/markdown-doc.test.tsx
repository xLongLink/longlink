import { MarkdownDoc } from '@/pages/Docs';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('MarkdownDoc', () => {
    it('offsets generated heading anchors away from the heading text', () => {
        const output = renderToStaticMarkup(createElement(MarkdownDoc, { content: '# Layout' }));

        expect(output).toContain('href="#layout"');
        expect(output).toContain('-translate-x-7');
        expect(output).toContain('Link to this heading');
    });
});

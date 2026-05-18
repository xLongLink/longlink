import { BaseUrlContext, resolveUrl, useUrl } from '@xml/core/url';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('resolveUrl', () => {
    it('joins base and relative paths', () => {
        expect(resolveUrl('/api', '/items')).toBe('/api/items');
        expect(resolveUrl('/api/', 'items')).toBe('/api/items');
    });

    it('returns absolute urls unchanged', () => {
        expect(resolveUrl('/api', 'https://example.com')).toBe('https://example.com');
    });

    it('resolves dot segments', () => {
        expect(resolveUrl('/api', '../items')).toBe('/items');
    });
});

describe('useUrl', () => {
    it('resolves urls from context', () => {
        function LinkValue() {
            return createElement('span', null, useUrl('/items'));
        }

        expect(
            renderToStaticMarkup(createElement(BaseUrlContext.Provider, { value: '/api' }, createElement(LinkValue)))
        ).toBe('<span>/api/items</span>');
    });
});

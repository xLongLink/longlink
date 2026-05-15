import { XmlErrorBoundary } from '@xml/core/errors';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('XmlErrorBoundary', () => {
    it('derives an error state from a thrown error', () => {
        expect(XmlErrorBoundary.getDerivedStateFromError(new Error('boom'))).toEqual({ error: new Error('boom') });
    });

    it('renders the error message when state contains an error', () => {
        const boundary = new XmlErrorBoundary({ children: createElement('span', null, 'ok') });

        boundary.state = { error: new Error('boom') };

        expect(renderToStaticMarkup(createElement('div', null, boundary.render()))).toContain('boom');
    });
});

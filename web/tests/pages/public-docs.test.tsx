import Home from '@/pages/Home';
import { LEGAL_PAGES } from '@/pages/legal/catalog';
import LegalPageRoute from '@/pages/legal/LegalPageRoute';
import Pricing from '@/pages/Pricing';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

describe('public pages', () => {
    it('renders the home page navigation, hero calls to action, and feature cards', () => {
        const output = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Home)));

        expect(output).toContain('Pricing');
        expect(output).toContain('Build workflow apps');
        expect(output).toContain('Get Started');
        expect(output).toContain('href="/organizations"');
        expect(output).toContain('Real applications');
        expect(output).toContain('Auth');
        expect(output).toContain('Structured UI');
        expect(output).toContain('Deploy');
    });

    it('renders the pricing tiers', () => {
        const output = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Pricing)));

        expect(output).toContain('Starter');
        expect(output).toContain('Team');
        expect(output).toContain('Platform');
        expect(output).toContain('Local SDK runtime');
        expect(output).toContain('Managed deployments');
        expect(output).toContain('Dedicated locations');
    });

    it('renders the minimal legal pages with metadata', () => {
        for (const page of LEGAL_PAGES) {
            const output = renderToStaticMarkup(
                createElement(MemoryRouter, null, createElement(LegalPageRoute, { page }))
            );

            expect(output).toContain(page.title);
            expect(output).toContain('Last updated:');
            expect(output).toContain('Edit this page in GitHub');
        }
    });
});

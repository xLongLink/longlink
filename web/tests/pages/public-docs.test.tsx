import { LegalLayout } from '@/layout/LegalLayout';
import Home from '@/pages/Home';
import Pricing from '@/pages/Pricing';
import { content as impressumContent, metadata as impressumMetadata } from '@/pages/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/pages/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/pages/legal/terms';
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
        expect(output).toContain('Runtime Pages');
        expect(output).toContain('Access');
        expect(output).toContain('Components');
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
        const pages = [
            { title: 'Impressum', content: impressumContent, metadata: impressumMetadata },
            { title: 'Privacy', content: privacyContent, metadata: privacyMetadata },
            { title: 'Terms', content: termsContent, metadata: termsMetadata },
        ];

        for (const page of pages) {
            const output = renderToStaticMarkup(
                createElement(
                    MemoryRouter,
                    null,
                    createElement(LegalLayout, {
                        title: page.title,
                        content: page.content,
                        metadata: page.metadata,
                    })
                )
            );

            expect(output).toContain(page.title);
            expect(output).toContain('Last updated:');
            expect(output).toContain('Edit this page in GitHub');
        }
    });
});

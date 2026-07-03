import { LegalLayout } from '@/layout/LegalLayout';
import Home from '@/pages/Home';
import Pricing from '@/pages/Pricing';
import { DOC_PAGES } from '@/pages/docs/catalog';
import { content as docsSdkComponentsContent } from '@/pages/docs/sdk/components';
import { content as docsSdkLayoutContent } from '@/pages/docs/sdk/layout';
import { content as docsSdkPagesContent } from '@/pages/docs/sdk/pages';
import { content as impressumContent, metadata as impressumMetadata } from '@/pages/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/pages/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/pages/legal/terms';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

describe('public pages and docs catalog', () => {
    it('renders the home page navigation, hero calls to action, and feature cards', () => {
        const output = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Home)));

        expect(output).toContain('Documentation');
        expect(output).toContain('Pricing');
        expect(output).toContain('Where bureaucracy');
        expect(output).toContain('meets code');
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

    it('catalogs the supported documentation pages', () => {
        const paths = DOC_PAGES.map((page) => page.path);
        const titles = DOC_PAGES.map((page) => page.title);

        expect(paths).toContain('/docs/api');
        expect(paths).toContain('/docs/api/self-hosted');
        expect(paths).toContain('/docs/sdk');
        expect(paths).toContain('/docs/sdk/environments');
        expect(paths).toContain('/docs/sdk/routes');
        expect(paths).toContain('/docs/sdk/storage');
        expect(paths).toContain('/docs/sdk/database');
        expect(paths).toContain('/docs/sdk/testing');
        expect(paths).toContain('/docs/sdk/building');
        expect(paths).toContain('/docs/sdk/pages');
        expect(paths).toContain('/docs/sdk/pages/layout');
        expect(paths).toContain('/docs/sdk/pages/components');
        expect(titles).toContain('Applications');
        expect(titles).toContain('Organizations');
    });

    it('documents XML state, data, control flow, expressions, invalidation, layout, and components', () => {
        const output = renderToStaticMarkup(
            createElement(MemoryRouter, null, [
                createElement('div', { key: 'pages' }, docsSdkPagesContent),
                createElement('div', { key: 'layout' }, docsSdkLayoutContent),
                createElement('div', { key: 'components' }, docsSdkComponentsContent),
            ])
        );

        expect(output).toContain('State');
        expect(output).toContain('Query');
        expect(output).toContain('For');
        expect(output).toContain('Global conditional prop');
        expect(output).toContain('i18n');
        expect(output).toContain('Expressions');
        expect(output).toContain('Invalidation');
        expect(output).toContain('Layout');
        expect(output).toContain('Columns');
        expect(output).toContain('Tabs');
        expect(output).toContain('Action');
        expect(output).toContain('Button');
        expect(output).toContain('DataTable');
    });
});

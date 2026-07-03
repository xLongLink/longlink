import DocsLayout from '@/layout/DocsLayout';
import { LegalLayout } from '@/layout/LegalLayout';
import NotFound from '@/pages/NotFound';
import { describe, expect, it, mock } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

mock.module('@/hooks/use-user', () => ({
    useUser: () => ({ user: null }),
}));

describe('layout shells', () => {
    it('renders docs sidebar, breadcrumbs, table of contents shell, metadata, and edit link', () => {
        const output = renderToStaticMarkup(
            createElement(
                MemoryRouter,
                { initialEntries: ['/docs/sdk/database'] },
                createElement(DocsLayout, {
                    content: createElement('div', null, [
                        createElement('h1', { key: 'title' }, 'Database'),
                        createElement('h2', { id: 'models', key: 'models' }, 'Models'),
                    ]),
                    metadata: {
                        lastUpdated: '2026-06-30',
                        editUrl: 'https://github.com/xLongLink/longlink/edit/main/docs/database',
                    },
                })
            )
        );

        expect(output).toContain('Documentation');
        expect(output).toContain('Application SDK');
        expect(output).toContain('On this page');
        expect(output).toContain('Last updated:');
        expect(output).toContain('Edit this page in GitHub');
    });

    it('renders legal metadata and edit links', () => {
        const output = renderToStaticMarkup(
            createElement(
                MemoryRouter,
                null,
                createElement(LegalLayout, {
                    title: 'Terms',
                    content: createElement('p', null, 'Legal copy'),
                    metadata: {
                        lastUpdated: '2026-06-30',
                        editUrl: 'https://github.com/xLongLink/longlink/edit/main/terms',
                    },
                })
            )
        );

        expect(output).toContain('Terms');
        expect(output).toContain('Legal copy');
        expect(output).toContain('Edit this page in GitHub');
    });

    it('renders the shared not found page with the current path', () => {
        const output = renderToStaticMarkup(
            createElement(MemoryRouter, { initialEntries: ['/missing'] }, createElement(NotFound))
        );

        expect(output).toContain('We can&#x27;t find that page');
        expect(output).toContain('/missing');
        expect(output).toContain('Back to Home');
        expect(output).toContain('See the Docs');
    });
});

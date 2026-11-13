import { resolve } from 'node:path';
import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { act, useState } from 'react';
import { access } from 'node:fs/promises';
import { withMounted } from '../../../render';
import { Wordmark } from '@/components/Wordmark';
import Assets from '@/platform/routes/branding/Assets';
import { AppearanceContext } from '@/lib/hooks/use-appearance';

it('keeps downloadable files aligned with the displayed light and dark assets', async () => {
    await withMounted(
        <Assets />,
        async (output) => {
            const figures = output.querySelectorAll('figure');
            expect(figures).toHaveLength(4);

            // Each displayed asset owns native downloads, not application navigation.
            for (const figure of figures) {
                const image = figure.querySelector('img');

                if (!image) throw new Error('Expected a preview image');
                const links = figure.querySelectorAll('a[download]');
                expect(links.length).toBe(image.src.includes('wordmark') ? 1 : 3);
                expect([...links].some((link) => link.getAttribute('href') === image.getAttribute('src'))).toBe(true);

                for (const link of links) {
                    const href = link.getAttribute('href');

                    if (!href) throw new Error('Expected a download destination');
                    expect(link.getAttribute('download')).toBe(href.split('/').at(-1));
                    expect(link.closest('figcaption')).not.toBeNull();
                    await access(resolve('public', href.slice(1)));
                }
            }
        },
        '/branding/assets'
    );
});

it('keeps both preview modes isolated while document and account appearance change', async () => {
    function Preview() {
        const [theme, setTheme] = useState<'light' | 'dark'>('light');

        return (
            <AppearanceContext value={{ appearance: { theme, accent: 'neutral' } }}>
                <Wordmark />
                <Assets />
                <button
                    id="change-appearance"
                    type="button"
                    onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
                >
                    Change appearance
                </button>
            </AppearanceContext>
        );
    }

    const previousTheme = document.documentElement.getAttribute('data-theme');

    try {
        document.documentElement.dataset.theme = 'light';
        await withMounted(
            <Preview />,
            async (output) => {
                document.documentElement.dataset.theme = 'light';
                const previews = [...output.querySelectorAll('.brand-assets-preview')];
                const images = previews.map((preview) => preview.querySelector('img'));
                const sources = images.map((image) => image?.getAttribute('src'));
                const downloads = [...output.querySelectorAll('a[download]')].map((link) => link.getAttribute('href'));
                expect(previews.map((preview) => preview.getAttribute('data-theme'))).toEqual([
                    'light',
                    'dark',
                    'light',
                    'dark'
                ]);
                expect(output.querySelector('img')?.getAttribute('src')).toBe('/images/longlink-wordmark-light.png');

                // The ambient wordmark must change; the two sibling previews must not.
                await act(async () => output.querySelector<HTMLButtonElement>('#change-appearance')?.click());
                document.documentElement.dataset.theme = 'dark';
                expect(output.querySelector('img')?.getAttribute('src')).toBe('/images/longlink-wordmark-dark.png');
                expect(images.map((image) => image?.getAttribute('src'))).toEqual(sources);
                expect([...output.querySelectorAll('a[download]')].map((link) => link.getAttribute('href'))).toEqual(
                    downloads
                );

                for (const preview of previews) {
                    const image = preview.querySelector('img');

                    if (!image) throw new Error('Expected a preview image');
                    const mode = preview.getAttribute('data-theme');
                    expect(image.getAttribute('src')).toContain(`-${mode}.png`);
                    expect(preview.closest('figure')?.querySelector('figcaption')?.closest('[data-theme]')).not.toBe(
                        preview
                    );
                }

                await act(async () => output.querySelector<HTMLButtonElement>('#change-appearance')?.click());
                document.documentElement.dataset.theme = 'light';
                expect(output.querySelector('img')?.getAttribute('src')).toBe('/images/longlink-wordmark-light.png');
                expect(images.map((image) => image?.getAttribute('src'))).toEqual(sources);
            },
            '/branding/assets'
        );
    } finally {
        if (previousTheme === null) document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', previousTheme);
    }
});

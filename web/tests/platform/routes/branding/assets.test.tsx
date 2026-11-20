import { resolve } from 'node:path';
import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { access } from 'node:fs/promises';
import { withMounted } from '../../../render';
import Assets from '@/platform/routes/branding/assets';

it('keeps downloadable files aligned with the displayed light and dark assets', async () => {
    await withMounted(
        <Assets />,
        async (output) => {
            const figures = output.querySelectorAll('figure');
            expect(figures.length).toBeGreaterThan(0);

            // Each displayed asset owns native downloads, not application navigation.
            for (const figure of figures) {
                const image = figure.querySelector('img');
                const preview = figure.querySelector('.brand-assets-preview');

                if (!image || !preview) throw new Error('Expected a preview image and container');
                expect(image.getAttribute('src')).toContain(`-${preview.getAttribute('data-theme')}.png`);
                expect(figure.querySelector('figcaption')?.closest('[data-theme]')).not.toBe(preview);
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

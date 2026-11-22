// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { withMounted } from '../render';
import { Footer } from '@/components/ui/footer';

it('isolates external-link openers', async () => {
    await withMounted(
        <Footer />,
        async (output) => {
            const externalLinks = output.querySelectorAll('footer a[target="_blank"]');
            expect(externalLinks.length).toBeGreaterThan(0);

            for (const link of externalLinks) {
                expect(link.getAttribute('rel')?.split(' ')).toEqual(
                    expect.arrayContaining(['noopener', 'noreferrer'])
                );
            }
        },
        '/pricing/'
    );
});

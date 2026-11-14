// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import { Footer } from '@/components/footer';
import { useLocation, useNavigate } from 'react-router';

/** Exposes the real router location and history while the footer stays mounted. */
function FooterNavigation() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    return (
        <>
            <output aria-label="Current page">{pathname}</output>
            <button type="button" onClick={() => void navigate(-1)}>
                Back
            </button>
            <Footer />
        </>
    );
}

it('navigates public and legal pages in the SPA and preserves back navigation', async () => {
    await withMounted(
        <FooterNavigation />,
        async (output) => {
            // Follow the public navigation before opening a legal page.
            await act(async () => output.querySelector<HTMLAnchorElement>('a[href="/docs/"]')?.click());
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/'));
            await act(async () =>
                output
                    .querySelector<HTMLAnchorElement>('nav[aria-label="Legal navigation"] a[href="/privacy/"]')
                    ?.click()
            );
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/privacy/'));

            // Return through real router history, then follow the brand home link.
            await act(async () => output.querySelector('button')?.click());
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/'));
            await act(async () => output.querySelector<HTMLAnchorElement>('a[aria-label="LongLink home"]')?.click());
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/'));
        },
        '/pricing/'
    );
});

it('leaves modified clicks, external sites and email to the browser without changing the SPA route', async () => {
    await withMounted(
        <FooterNavigation />,
        async (output) => {
            const docs = output.querySelector('a[href="/docs/"]');

            if (!docs) throw new Error('Expected documentation link');

            // A modified internal link must not be intercepted by the router.
            const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
            await act(async () => docs.dispatchEvent(modified));
            expect(modified.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe('/pricing/');

            // External destinations retain native activation and opener isolation.
            const externalLinks = output.querySelectorAll('footer a[target="_blank"]');
            expect(externalLinks.length).toBeGreaterThan(0);

            for (const link of externalLinks) {
                expect(link.getAttribute('rel')?.split(' ')).toEqual(
                    expect.arrayContaining(['noopener', 'noreferrer'])
                );
                const click = new MouseEvent('click', { bubbles: true, cancelable: true });
                await act(async () => link.dispatchEvent(click));
                expect(click.defaultPrevented).toBe(false);
            }

            const contact = output.querySelector(
                'nav[aria-label="Legal navigation"] a[href="mailto:info@longlink.dev"]'
            );

            if (!contact) throw new Error('Expected contact link');
            const email = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => contact.dispatchEvent(email));
            expect(email.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe('/pricing/');
        },
        '/pricing/'
    );
});

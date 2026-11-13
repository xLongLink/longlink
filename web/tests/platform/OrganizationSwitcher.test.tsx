// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { membership } from './render';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import { useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import { OrganizationSwitcher } from '@/platform/components/OrganizationSwitcher';

/** Observes actual Router navigation. */
function Location() {
    const location = useLocation();

    return <output>{location.pathname}</output>;
}

/** Finds native controls, including the portalled retry action. */
function button(label: string) {
    const control = Array.from(document.querySelectorAll('button')).find(
        (element) => element.getAttribute('aria-label') === label || element.textContent === label
    );

    if (!control) throw new Error(`Missing button: ${label}`);

    return control;
}

it('loads lazily, recovers from a failed request, and closes immediately on native SPA navigation', async () => {
    // A transient membership failure must remain recoverable without replacing the page or Router.
    const events = userEvent.setup();
    const transport = vi.spyOn(globalThis, 'fetch');
    transport.mockResolvedValueOnce(Response.json({ detail: 'Unavailable' }, { status: 503 }));
    transport.mockImplementation(async () => Response.json([membership]));

    try {
        await withMounted(
            <>
                <OrganizationSwitcher organization={membership.organization} />
                <Location />
            </>,
            async (output) => {
                expect(transport).not.toHaveBeenCalled();
                await act(async () => await events.click(button('Acme')));
                await vi.waitFor(() =>
                    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Unable')
                );
                expect(transport).toHaveBeenCalledTimes(1);
                await act(async () => await events.click(button('Retry')));
                const href = `/orgs/${membership.organization.id}`;
                await vi.waitFor(() => expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull());
                expect(transport).toHaveBeenCalledTimes(2);
                const link = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);

                if (!link) throw new Error('Missing organization link');
                expect(link.getAttribute('aria-current')).toBe('page');
                const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
                await act(async () => link.dispatchEvent(modified));
                expect(modified.defaultPrevented).toBe(false);
                expect(output.querySelector('output')?.textContent).toBe('/');
                expect(button('Acme').getAttribute('aria-expanded')).toBe('false');

                await act(async () => await events.click(button('Acme')));
                await vi.waitFor(() => expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull());
                const destination = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);

                if (!destination) throw new Error('Missing organization destination');
                await act(async () => await events.click(destination));
                expect(output.querySelector('output')?.textContent).toBe(href);
                expect(button('Acme').getAttribute('aria-expanded')).toBe('false');
            }
        );
    } finally {
        transport.mockRestore();
    }
});

it('supports keyboard, outside, and touch dismissal and aborts the request when its owner unmounts', async () => {
    // Leaving the owning header must not leave its in-flight request running.
    const events = userEvent.setup();
    let signal: AbortSignal | undefined;

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        if (!(input instanceof Request)) throw new Error('Expected API request');
        signal = input.signal;

        return await new Promise<Response>((_resolve, reject) => {
            input.signal.addEventListener('abort', () => reject(input.signal.reason), { once: true });
        });
    });

    try {
        await withMounted(
            <>
                <OrganizationSwitcher organization={membership.organization} />
                <button type="button">Outside</button>
            </>,
            async () => {
                await act(async () => {
                    button('Acme').focus();
                    await events.keyboard('{Enter}');
                });
                expect(document.querySelector('[role="status"]')?.textContent).toContain('Loading');
                expect(document.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
                await act(async () => await events.tab({ shift: true }));
                expect(document.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
                await act(async () => await events.keyboard('{Escape}'));
                expect(button('Acme').getAttribute('aria-expanded')).toBe('false');
                expect(document.activeElement).toBe(button('Acme'));
                await act(async () => await events.click(button('Acme')));
                await act(async () => await events.click(button('Outside')));
                expect(button('Acme').getAttribute('aria-expanded')).toBe('false');
                expect(document.activeElement).toBe(button('Outside'));
                await act(async () => {
                    await events.pointer([
                        { keys: '[TouchA>]', target: button('Acme') },
                        { keys: '[/TouchA]', target: button('Acme') }
                    ]);
                });
                expect(button('Acme').getAttribute('aria-expanded')).toBe('true');
                expect(signal?.aborted).toBe(false);
            }
        );
        expect(signal?.aborted).toBe(true);
    } finally {
        transport.mockRestore();
    }
});

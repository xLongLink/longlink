// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { flushSync } from 'react-dom';
import { it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { renderPlatform } from '../../render';
import { createRoot } from 'react-dom/client';
import Page from '@/platform/routes/auth/Register';
import userEvent from '@testing-library/user-event';
import { ApiBoundary } from '@/components/ApiBoundary';
import { ApiProvider } from '@/components/ApiProvider';
import { AppearanceProvider } from '@/components/Appearance';

it('preserves a supplied email when linking back to sign in', () => {
    // Act
    const output = renderPlatform(
        <ApiProvider>
            <Page />
        </ApiProvider>,
        '/auth/register?email=owner%40example.com'
    );

    // Assert
    expect(output.querySelector('input[name="email"]')?.getAttribute('value')).toBe('owner@example.com');
    expect(output.querySelector('a[href="/login?email=owner%40example.com"]')).not.toBeNull();
});

it('delivers registration failure and confirmed success through initially empty channels in one queue', async () => {
    let finishRequest: ((response: Response) => void) | undefined;

    const response = new Promise<Response>((resolve) => {
        finishRequest = resolve;
    });

    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(Response.json({ detail: 'Registration temporarily unavailable' }, { status: 503 }))
        .mockReturnValueOnce(response);

    const output = document.createElement('section');
    document.body.append(output);
    const caughtErrors: unknown[] = [];
    const root = createRoot(output, { onCaughtError: (error) => caughtErrors.push(error) });
    const deliveries = new Map<Element, string[]>();

    const observer = new MutationObserver(() => {
        for (const channel of document.querySelectorAll('[data-sonner-toast] [aria-live]')) {
            const text = channel.textContent ?? '';
            const history = deliveries.get(channel);

            if (!history) {
                deliveries.set(channel, [text]);

                continue;
            }

            if (history.at(-1) !== text) history.push(text);
        }
    });

    observer.observe(document.body, { subtree: true, childList: true, characterData: true });

    try {
        flushSync(() =>
            root.render(
                <MemoryRouter initialEntries={['/auth/register?email=owner%40example.com']}>
                    <AppearanceProvider preference={{ theme: 'dark', accent: 'neutral' }}>
                        <ApiProvider>
                            <ApiBoundary>
                                <Page />
                            </ApiBoundary>
                        </ApiProvider>
                    </AppearanceProvider>
                </MemoryRouter>
            )
        );
        const events = userEvent.setup();
        const submit = output.querySelector<HTMLButtonElement>('button[type="submit"]');

        if (!submit) throw new Error('Missing registration submit');
        await events.click(submit);
        await vi.waitFor(() =>
            expect(document.querySelector('[data-sonner-toast]')?.textContent).toContain(
                'Registration temporarily unavailable'
            )
        );
        expect(document.body.textContent).not.toContain('Check your inbox for the registration link.');
        expect(caughtErrors).toEqual([
            expect.objectContaining({ status: 503, message: 'Registration temporarily unavailable' }),
        ]);

        const failure = document.querySelector('[data-sonner-toast]');
        const failureChannel = failure?.querySelector('[aria-live]');

        if (!failureChannel) throw new Error('Missing failure announcement channel');
        await vi.waitFor(() =>
            expect(deliveries.get(failureChannel)).toEqual(['', 'Registration temporarily unavailable'])
        );

        const retry = Array.from(output.querySelectorAll('button')).find((button) => button.textContent === 'Retry');

        if (!retry) throw new Error('Missing registration recovery');
        await events.click(retry);
        await vi.waitFor(() => expect(output.querySelector('button[type="submit"]')).not.toBeNull());
        const recoveredSubmit = output.querySelector<HTMLButtonElement>('button[type="submit"]');

        if (!recoveredSubmit) throw new Error('Missing recovered registration form');
        await events.click(recoveredSubmit);
        await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
        expect(document.body.textContent).not.toContain('Check your inbox for the registration link.');

        finishRequest?.(new Response(null, { status: 204 }));
        await vi.waitFor(() => expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(2));

        const confirmation = Array.from(document.querySelectorAll('[data-sonner-toast]')).find((notification) =>
            notification.textContent?.includes('Check your inbox for the registration link.')
        );

        expect(confirmation).toBeDefined();
        const confirmationChannel = confirmation?.querySelector('[aria-live]');

        if (!confirmationChannel) throw new Error('Missing registration announcement channel');
        await vi.waitFor(() =>
            expect(deliveries.get(confirmationChannel)).toEqual(['', 'Check your inbox for the registration link.'])
        );
        expect(confirmationChannel.getAttribute('aria-live')).toBe('polite');
        expect(failureChannel.getAttribute('aria-live')).toBe('assertive');
        expect(deliveries.size).toBe(2);
        expect(confirmation?.closest('[aria-live]')?.getAttribute('aria-live')).toBe('off');
        expect(failure?.closest('[aria-live]')?.getAttribute('aria-live')).toBe('off');
        expect(confirmation?.parentElement).toBe(failure?.parentElement);
        expect(document.querySelectorAll('[data-sonner-toaster]')).toHaveLength(1);

        const requests = transport.mock.calls.map(([input]) => (input instanceof Request ? input : new Request(input)));

        expect(requests.map((request) => [request.method, new URL(request.url).pathname])).toEqual([
            ['POST', '/api/v1/auth/register'],
            ['POST', '/api/v1/auth/register'],
        ]);

        const dismiss = confirmation?.querySelector<HTMLButtonElement>('[aria-label="Dismiss notification"]');

        if (!dismiss) throw new Error('Missing registration notification dismissal');
        await events.click(dismiss);
        await vi.waitFor(() => {
            expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
            expect(document.querySelector('[data-sonner-toast]')).toBe(failure);
        });
    } finally {
        observer.disconnect();
        root.unmount();
        output.remove();
        finishRequest?.(new Response(null, { status: 204 }));
        transport.mockRestore();
    }
});

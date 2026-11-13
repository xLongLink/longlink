// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { api } from '@/lib/api';
import { flushSync } from 'react-dom';
import { it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { createErrorReporter } from '@/lib/errors';
import { NativeLoading } from '@/components/custom/NativeLoading';
import { NativeNotificationMessage } from '@/components/NativeNotificationMessage';

it('delivers a startup API error before document load completes while initial loading status stays silent', async () => {
    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(Response.json({ detail: 'Account temporarily unavailable' }, { status: 503 }));

    const pendingDocument = document.implementation.createHTMLDocument('Starting account');
    const output = pendingDocument.createElement('section');
    pendingDocument.body.append(output);
    const root = createRoot(output);
    const deliveries = new Map<Element, string[]>();

    const observer = new MutationObserver(() => {
        for (const channel of output.querySelectorAll('[aria-live="assertive"]')) {
            const text = channel.textContent ?? '';
            const history = deliveries.get(channel);

            if (!history) {
                deliveries.set(channel, [text]);

                continue;
            }

            if (history.at(-1) !== text) history.push(text);
        }
    });

    observer.observe(output, { childList: true, subtree: true, characterData: true });

    const reportError = createErrorReporter((message) => {
        flushSync(() => root.render(<NativeNotificationMessage message={message} priority="assertive" />));
    });

    try {
        expect(pendingDocument.readyState).not.toBe('complete');
        flushSync(() => root.render(<NativeLoading label="Loading account" />));
        expect(output.querySelector('[role="status"]')?.textContent).toBe('');

        await api('/api/v1/me').catch(reportError);
        await vi.waitFor(() =>
            expect(Array.from(deliveries.values())).toEqual([['', 'Account temporarily unavailable']])
        );
        expect(pendingDocument.readyState).not.toBe('complete');
        expect(output.querySelectorAll('[aria-live]')).toHaveLength(1);
        expect(output.querySelector('[role="status"]')).toBeNull();
        expect(transport).toHaveBeenCalledTimes(1);
    } finally {
        observer.disconnect();
        root.unmount();
        output.remove();
        transport.mockRestore();
    }
});

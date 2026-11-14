// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../render';
import type { Appearance } from '@/lib/appearance';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { AppearanceProvider } from '@/components/appearance';

/** Shows the selected preference alongside an uncontrolled draft. */
function Preference() {
    const { appearance } = useAppearance();

    return (
        <>
            <output>{`${appearance.theme}/${appearance.accent}`}</output>
            <input aria-label="Draft" defaultValue="Unsaved draft" />
        </>
    );
}

/** Switches between standalone cache ownership and authoritative account preferences. */
function AppearanceSession() {
    const [preference, setPreference] = useState<Appearance>();

    return (
        <AppearanceProvider preference={preference}>
            <button onClick={() => setPreference({ theme: 'light', accent: 'blue' })}>Use account</button>
            <button onClick={() => setPreference(undefined)}>Use cache</button>
            <Preference />
        </AppearanceProvider>
    );
}

it('observes standalone cache updates, defers to account preferences, and resumes fallback without remounting', async () => {
    localStorage.setItem('longlink:appearance', JSON.stringify({ theme: 'dark', accent: 'red' }));

    try {
        await withMounted(<AppearanceSession />, async (output) => {
            expect(output.querySelector('output')?.textContent).toBe('dark/red');

            // Standalone hosts follow cross-tab changes through the real storage subscription.
            await act(async () => {
                localStorage.setItem('longlink:appearance', JSON.stringify({ theme: 'light', accent: 'green' }));
                window.dispatchEvent(new StorageEvent('storage', { key: 'longlink:appearance' }));
            });
            expect(output.querySelector('output')?.textContent).toBe('light/green');
            const input = output.querySelector('input');
            const buttons = output.querySelectorAll('button');

            // Account data overrides later cache changes without replacing the mounted subtree.
            await act(async () => buttons[0]?.click());
            expect(output.querySelector('output')?.textContent).toBe('light/blue');
            await act(async () => {
                localStorage.setItem('longlink:appearance', JSON.stringify({ theme: 'dark', accent: 'red' }));
                window.dispatchEvent(new StorageEvent('storage', { key: 'longlink:appearance' }));
            });
            expect(output.querySelector('output')?.textContent).toBe('light/blue');

            // Returning to cache ownership reads the latest snapshot and preserves the same input.
            await act(async () => buttons[1]?.click());
            expect(output.querySelector('output')?.textContent).toBe('dark/red');
            expect(output.querySelector('input')).toBe(input);
        });
    } finally {
        localStorage.removeItem('longlink:appearance');
    }
});

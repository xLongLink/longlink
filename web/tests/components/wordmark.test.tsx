import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { act, useState } from 'react';
import { withMounted } from '../render';
import { Wordmark } from '@/components/ui/wordmark';
import { AppearanceProvider } from '@/components/appearance';

it('keeps ambient assets mounted without changing an explicit wordmark mode during account changes', async () => {
    function Preview() {
        const [theme, setTheme] = useState<'light' | 'dark'>('light');

        return (
            <AppearanceProvider preference={{ theme, accent: 'neutral' }}>
                <Wordmark />
                <Wordmark mode="light" size="heading" />
                <img
                    src="/images/lock.png"
                    alt="Protected content"
                    className="size-20 object-contain invert dark:invert-0"
                />
                <button type="button" onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
                    Change appearance
                </button>
            </AppearanceProvider>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const images = output.querySelectorAll('img');
        const explicitWordmark = images[2];
        const illustration = images[3];

        await act(async () => output.querySelector('button')?.click());
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(output.querySelectorAll('img')[0]).toBe(images[0]);
        expect(output.querySelectorAll('img')[1]).toBe(images[1]);
        expect(explicitWordmark.getAttribute('src')).toBe('/images/longlink-wordmark-light.png');
        await act(async () => output.querySelector('button')?.click());
        expect(document.documentElement.dataset.theme).toBe('light');
        expect(explicitWordmark.getAttribute('src')).toBe('/images/longlink-wordmark-light.png');
        expect(output.querySelectorAll('img')[3]).toBe(illustration);
        expect(illustration.getAttribute('src')).toBe('/images/lock.png');
        expect(illustration.classList.contains('object-contain')).toBe(true);
    });
});

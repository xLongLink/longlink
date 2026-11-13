import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { act, useState } from 'react';
import { withMounted } from '../render';
import { Wordmark } from '@/components/Wordmark';
import { Illustration } from '@/components/Illustration';
import { AppearanceProvider } from '@/components/Appearance';

it('updates account branding without changing an explicitly scoped preview', async () => {
    function Preview() {
        const [theme, setTheme] = useState<'light' | 'dark'>('light');

        return (
            <AppearanceProvider preference={{ theme, accent: 'neutral' }}>
                <Wordmark />
                <Wordmark mode="light" size="heading" />
                <Illustration src="/images/lock.png" alt="Protected content" className="size-20 object-contain" />
                <button type="button" onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
                    Change appearance
                </button>
            </AppearanceProvider>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const images = output.querySelectorAll('img');

        await act(async () => output.querySelector('button')?.click());
        expect(output.querySelectorAll('img')[0]).toBe(images[0]);
        expect(images[0].getAttribute('src')).toBe('/images/longlink-wordmark-dark.png');
        expect(images[1].getAttribute('src')).toBe('/images/longlink-wordmark-light.png');
        expect(images[2].classList.contains('invert')).toBe(false);
        expect(images[2].classList.contains('object-contain')).toBe(true);
        await act(async () => output.querySelector('button')?.click());
        expect(images[0].getAttribute('src')).toBe('/images/longlink-wordmark-light.png');
        expect(images[1].getAttribute('src')).toBe('/images/longlink-wordmark-light.png');
        expect(output.querySelectorAll('img')[2]).toBe(images[2]);
        expect(images[2].classList.contains('invert')).toBe(true);
        expect(images[2].getAttribute('src')).toBe('/images/lock.png');
    });
});

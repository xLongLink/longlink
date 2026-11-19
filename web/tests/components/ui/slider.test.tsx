// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { SliderExample } from '@/platform/routes/docs/sdk/views/slider';

/** Supplies layout measurements that Happy DOM cannot calculate. */
function measureSlider(form: HTMLFormElement | null) {
    if (!form) return;

    for (const thumb of form.querySelectorAll<HTMLElement>('[data-slot="slider-thumb"]')) {
        thumb.getBoundingClientRect = () => new DOMRect(0, 0, 12, 12);
        const control = thumb.parentElement;

        if (control) control.getBoundingClientRect = () => new DOMRect(0, 0, 200, 20);
    }
}

it('submits edits from the labeled documentation example without duplicate form carriers', async () => {
    const user = userEvent.setup();

    await withMounted(
        <form ref={measureSlider}>
            <SliderExample />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector<HTMLInputElement>('input[type="range"]');

            if (!form || !input) throw new Error('Expected progress form');
            expect(output.querySelectorAll('input[type="range"]')).toHaveLength(1);
            expect(document.getElementById(input.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Progress');
            expect(
                document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent?.trim()
            ).toBeTruthy();
            await act(async () => user.tab());
            await act(async () => user.keyboard('{ArrowRight}'));
            expect(new FormData(form).getAll('progress')).toEqual(['61']);
        }
    );
});

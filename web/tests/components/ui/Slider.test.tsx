// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { SliderExample } from '@/platform/routes/docs/sdk/views/Slider';
import { SliderControl, SliderField, SliderRange, SliderThumb, SliderTrack } from '@/components/ui/Slider';

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
            expect(document.getElementById(input.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Progress');
            await act(async () => user.tab());
            await act(async () => user.keyboard('{ArrowRight}'));
            expect(new FormData(form).getAll('progress')).toEqual(['61']);
        }
    );
});

it('preserves caller-authored range labels and repeated form values while excluding disabled fields', async () => {
    const user = userEvent.setup();

    await withMounted(
        <form ref={measureSlider}>
            <SliderField
                name="budget"
                label="Budget"
                description="Monthly limits"
                defaultValue={[10, 30]}
                step={5}
                minStepsBetweenValues={2}
            >
                <SliderControl>
                    <SliderTrack>
                        <SliderRange />
                    </SliderTrack>
                    <SliderThumb index={0} aria-label="Minimum budget" />
                    <SliderThumb index={1} aria-label="Maximum budget" />
                </SliderControl>
            </SliderField>
            <SliderField name="locked" label="Locked" defaultValue={20} disabled />
            <button type="submit">Submit</button>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const inputs = output.querySelectorAll<HTMLInputElement>('input[type="range"]');
            const submit = output.querySelector('button');

            if (!form || !inputs[0] || !inputs[1] || !submit) throw new Error('Expected budget form');
            expect(inputs[0].getAttribute('aria-label')).toBe('Minimum budget');
            expect(inputs[1].getAttribute('aria-label')).toBe('Maximum budget');
            const group = inputs[0].closest('[role="group"]');
            expect(document.getElementById(group?.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
                'Monthly limits'
            );
            await act(async () => user.tab());
            await act(async () => user.keyboard('{ArrowRight}'));
            await act(async () => user.tab());
            await act(async () => user.keyboard('{ArrowRight}'));
            await act(async () => user.tab());
            expect(document.activeElement).toBe(submit);
            expect([...new FormData(form)]).toEqual([
                ['budget', '15'],
                ['budget', '35'],
            ]);
        }
    );
});

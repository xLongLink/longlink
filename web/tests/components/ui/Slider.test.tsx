// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { Slider } from '@/components/ui/Slider';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { DirectionProvider } from '@base-ui/react/direction-provider';

/** Supplies only layout measurements absent from Happy DOM, before the slider's inset measurement. */
function measureSlider(form: HTMLFormElement | null) {
    if (!form) return;

    for (const control of form.querySelectorAll<HTMLElement>('.view-slider-control')) {
        control.getBoundingClientRect = () => new DOMRect(0, 0, 200, 20);
    }

    for (const thumb of form.querySelectorAll<HTMLElement>('.view-slider-thumb')) {
        thumb.getBoundingClientRect = () => {
            const input = thumb.querySelector('input');

            if (!input) throw new Error('Expected thumb input');

            return new DOMRect(
                ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 180,
                0,
                20,
                20
            );
        };
    }
}

it('uses the supplied minimum as the omitted value default', () => {
    // Act
    const output = renderStatic(<Slider label="Quantity" name="quantity" min={5} max={20} />);

    // Assert
    expect(output.querySelector('input[name="quantity"]')?.getAttribute('value')).toBe('5');
});

it.each(['ltr', 'rtl'] as const)(
    'clamps keyboard increments at the range gap in %s without duplicate callbacks',
    async (direction) => {
        const user = userEvent.setup();
        const changes: [number, number][] = [];
        const commits: [number, number][] = [];

        await withMounted(
            <DirectionProvider direction={direction}>
                <form ref={measureSlider}>
                    <Slider
                        label="Budget"
                        name="budget"
                        defaultValue={[10, 30]}
                        min={0}
                        max={100}
                        step={5}
                        minStepsBetweenThumbs={2}
                        onChange={(next: [number, number]) => changes.push(next)}
                        onChangeEnd={(next: [number, number]) => commits.push(next)}
                    />
                </form>
            </DirectionProvider>,
            async (output) => {
                const form = output.querySelector('form');
                const inputs = output.querySelectorAll<HTMLInputElement>('input[type="range"]');

                if (!form || !inputs[0] || !inputs[1]) throw new Error('Expected budget range');
                await act(async () => user.tab());
                await act(async () => user.keyboard('{PageUp}'));
                expect(new FormData(form).getAll('budget')).toEqual(['20', '30']);
                await act(async () => user.tab());
                await act(async () => user.keyboard('{End}'));
                expect(new FormData(form).getAll('budget')).toEqual(['20', '100']);
                await act(async () => user.keyboard('{PageDown}'));
                expect(new FormData(form).getAll('budget')).toEqual(['20', '50']);
                await act(async () => user.keyboard('{PageDown}'));
                expect(new FormData(form).getAll('budget')).toEqual(['20', '30']);
                await act(async () => user.keyboard(direction === 'rtl' ? '{ArrowLeft}' : '{ArrowRight}'));
                expect(new FormData(form).getAll('budget')).toEqual(['20', '35']);
                expect(changes).toEqual([
                    [20, 30],
                    [20, 100],
                    [20, 50],
                    [20, 30],
                    [20, 35],
                ]);
                expect(commits).toEqual(changes);
                expect(inputs[0].value).toBe('20');
                expect(inputs[1].value).toBe('35');
            }
        );
    }
);

it('normalizes descending endpoints for thumbs, value bubbles, and repeated serialization without mutating the tuple', async () => {
    const supplied: [number, number] = [150, -5];
    Object.freeze(supplied);

    await withMounted(
        <form ref={measureSlider}>
            <Slider label="Budget" name="budget" value={supplied} min={10} max={90} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const inputs = output.querySelectorAll<HTMLInputElement>('input[type="range"]');
            const bubbles = output.querySelectorAll('.view-slider-value');

            if (!form || !inputs[0] || !inputs[1]) throw new Error('Expected normalized budget');
            expect(new FormData(form).getAll('budget')).toEqual(['10', '90']);
            expect([inputs[0].getAttribute('aria-valuenow'), inputs[1].getAttribute('aria-valuenow')]).toEqual([
                '10',
                '90',
            ]);
            expect([...bubbles].map((bubble) => bubble.textContent)).toEqual(['10', '90']);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('budget')).toEqual(['10', '90']);
            expect(supplied).toEqual([150, -5]);
        }
    );
});

it('commits the accepted controlled value after a rejected pointer drag, not its proposed endpoint', async () => {
    const user = userEvent.setup();
    const changes: number[] = [];
    const commits: number[] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider
                label="Progress"
                name="progress"
                value={20}
                onChange={(next: number) => changes.push(next)}
                onChangeEnd={(next: number) => commits.push(next)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const thumb = output.querySelector<HTMLElement>('.view-slider-thumb');
            const control = output.querySelector<HTMLElement>('.view-slider-control');

            if (!form || !thumb || !control) throw new Error('Expected controlled progress');
            await act(async () =>
                user.pointer({ target: thumb, keys: '[MouseLeft>]', coords: { clientX: 46, clientY: 10 } })
            );
            await act(async () => user.pointer({ target: control, coords: { clientX: 100, clientY: 10 } }));
            expect(changes).toEqual([50]);
            expect(commits).toEqual([]);
            expect(new FormData(form).getAll('progress')).toEqual(['20']);
            await act(async () => user.pointer({ keys: '[/MouseLeft]' }));
            expect(commits).toEqual([20]);
            expect(changes).toEqual([50]);
            expect(new FormData(form).getAll('progress')).toEqual(['20']);
        }
    );
});

it('finishes unchanged presses once without inventing changes or duplicate changed-gesture commits', async () => {
    const user = userEvent.setup();
    const changes: number[] = [];
    const commits: number[] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider
                label="Progress"
                name="progress"
                defaultValue={20}
                onChange={(next: number) => changes.push(next)}
                onChangeEnd={(next: number) => commits.push(next)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const thumb = output.querySelector<HTMLElement>('.view-slider-thumb');
            const control = output.querySelector<HTMLElement>('.view-slider-control');

            if (!form || !thumb || !control) throw new Error('Expected editable progress');
            await act(async () =>
                user.pointer({ target: thumb, keys: '[MouseLeft]', coords: { clientX: 46, clientY: 10 } })
            );
            expect(changes).toEqual([]);
            expect(commits).toEqual([20]);
            await act(async () =>
                user.pointer({ target: control, keys: '[MouseLeft]', coords: { clientX: 100, clientY: 10 } })
            );
            expect(changes).toEqual([50]);
            expect(commits).toEqual([20, 50]);
            await act(async () =>
                user.pointer({ target: control, keys: '[MouseLeft]', coords: { clientX: 100, clientY: 10 } })
            );
            expect(changes).toEqual([50]);
            expect(commits).toEqual([20, 50, 50]);
            expect(new FormData(form).getAll('progress')).toEqual(['50']);
        }
    );
});

it('abandons pending pointer completion on unmount', async () => {
    const user = userEvent.setup();
    const commits: number[] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider label="Progress" value={20} onChangeEnd={(next: number) => commits.push(next)} />
        </form>,
        async (output) => {
            const thumb = output.querySelector<HTMLElement>('.view-slider-thumb');

            if (!thumb) throw new Error('Expected progress thumb');
            await act(async () =>
                user.pointer({ target: thumb, keys: '[MouseLeft>]', coords: { clientX: 46, clientY: 10 } })
            );
        }
    );
    await act(async () => user.pointer({ target: document.body, keys: '[/MouseLeft]' }));
    expect(commits).toEqual([]);
});

it('serializes the same bounded value that the thumb displays without replacing caller-owned input', async () => {
    const changes: number[] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider
                label="Quantity"
                name="quantity"
                value={-5}
                min={5}
                max={20}
                onChange={(value: number) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector<HTMLInputElement>('input[type="range"]');

            if (!form || !input) throw new Error('Expected bounded slider');
            expect(input.getAttribute('aria-valuenow')).toBe('5');
            expect(new FormData(form).getAll('quantity')).toEqual(['5']);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('quantity')).toEqual(['5']);
            expect(changes).toEqual([]);
        }
    );
});

it('steps within bounds, commits edits, and resets local state without emitting changes', async () => {
    const user = userEvent.setup();
    const changes: number[] = [];
    const commits: number[] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider
                label="Quantity"
                description="Units to order"
                name="quantity"
                min={5}
                max={15}
                step={2}
                defaultValue={7}
                required
                onChange={(value: number) => changes.push(value)}
                onChangeEnd={(value: number) => commits.push(value)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector<HTMLInputElement>('input[type="range"]');

            if (!form || !input) throw new Error('Expected quantity slider');
            expect(document.getElementById(input.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
                'Quantity · Required'
            );
            expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
                'Units to order'
            );
            await act(async () => user.tab());
            expect(document.activeElement).toBe(input);
            await act(async () => user.keyboard('{ArrowRight}'));
            expect(new FormData(form).getAll('quantity')).toEqual(['9']);
            expect(changes).toEqual([9]);
            expect(commits).toEqual([9]);
            await act(async () => user.keyboard('{End}{ArrowRight}'));
            expect(new FormData(form).getAll('quantity')).toEqual(['15']);
            await act(async () => user.keyboard('{Home}{ArrowLeft}'));
            expect(new FormData(form).getAll('quantity')).toEqual(['5']);
            const count = changes.length;
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(new FormData(form).getAll('quantity')).toEqual(['5']);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('quantity')).toEqual(['7']);
            expect(input.value).toBe('7');
            expect(changes).toHaveLength(count);
        }
    );
});

it('accepts pointer edits and commits the final track value', async () => {
    const user = userEvent.setup();
    const changes: number[] = [];
    const commits: number[] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider
                label="Progress"
                name="progress"
                defaultValue={20}
                onChange={(value: number) => changes.push(value)}
                onChangeEnd={(value: number) => commits.push(value)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const control = output.querySelector<HTMLElement>('.view-slider-control');

            if (!form || !control) throw new Error('Expected progress slider');
            await act(async () =>
                user.pointer({ target: control, keys: '[MouseLeft]', coords: { clientX: 100, clientY: 10 } })
            );
            expect(new FormData(form).getAll('progress')).toEqual(['50']);
            expect(changes).toEqual([50]);
            expect(commits).toEqual([50]);
        }
    );
});

it('keeps range endpoints ordered with a minimum step gap and repeated form names', async () => {
    const user = userEvent.setup();
    const changes: [number, number][] = [];
    const commits: [number, number][] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider
                label="Budget"
                name="budget"
                defaultValue={[10, 30]}
                min={0}
                max={50}
                step={5}
                minStepsBetweenThumbs={2}
                onChange={(value: [number, number]) => changes.push(value)}
                onChangeEnd={(value: [number, number]) => commits.push(value)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const inputs = output.querySelectorAll<HTMLInputElement>('input[type="range"]');

            if (!form || !inputs[0] || !inputs[1]) throw new Error('Expected budget range');
            expect(inputs[0].getAttribute('aria-label')).toBe('Minimum value');
            expect(inputs[1].getAttribute('aria-label')).toBe('Maximum value');
            await act(async () => user.tab());
            await act(async () => user.keyboard('{End}'));
            expect(new FormData(form).getAll('budget')).toEqual(['20', '30']);
            await act(async () => user.keyboard('{ArrowRight}'));
            expect(new FormData(form).getAll('budget')).toEqual(['20', '30']);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(inputs[1]);
            await act(async () => user.keyboard('{Home}{ArrowLeft}'));
            expect(new FormData(form).getAll('budget')).toEqual(['20', '30']);
            await act(async () => user.keyboard('{ArrowRight}'));
            expect(new FormData(form).getAll('budget')).toEqual(['20', '35']);
            expect(changes).toEqual([
                [20, 30],
                [20, 35],
            ]);
            expect(commits).toEqual(changes);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('budget')).toEqual(['10', '30']);
            expect(changes).toHaveLength(2);
        }
    );
});

it('does not change caller-owned values when edits are declined or a form resets', async () => {
    const user = userEvent.setup();
    const changes: number[] = [];
    const commits: number[] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider
                label="Quantity"
                name="quantity"
                value={12}
                defaultValue={3}
                onChange={(value: number) => changes.push(value)}
                onChangeEnd={(value: number) => commits.push(value)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector<HTMLInputElement>('input[type="range"]');

            if (!form || !input) throw new Error('Expected controlled quantity');
            await act(async () => user.tab());
            await act(async () => user.keyboard('{ArrowRight}'));
            expect(changes).toEqual([13]);
            expect(commits).toEqual([13]);
            expect(input.value).toBe('12');
            expect(new FormData(form).getAll('quantity')).toEqual(['12']);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('quantity')).toEqual(['12']);
            expect(changes).toEqual([13]);
            expect(commits).toEqual([13]);
        }
    );
});

it('keeps disabled thumbs focusable without edits, commits, or serialized values', async () => {
    const user = userEvent.setup();
    const changes: [number, number][] = [];

    await withMounted(
        <form ref={measureSlider}>
            <Slider
                label="Locked"
                name="locked"
                disabled
                required
                defaultValue={[10, 30]}
                onChange={(value: [number, number]) => changes.push(value)}
                onChangeEnd={(value: [number, number]) => changes.push(value)}
            />
            <button type="button">Next</button>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const inputs = output.querySelectorAll<HTMLInputElement>('input[type="range"]');
            const control = output.querySelector<HTMLElement>('.view-slider-control');

            if (!form || !inputs[0] || !inputs[1] || !control) throw new Error('Expected disabled slider');
            await act(async () => user.tab());
            expect(document.activeElement).toBe(inputs[0]);
            await act(async () => user.keyboard('{End}{ArrowRight}'));
            await act(async () => user.tab());
            expect(document.activeElement).toBe(inputs[1]);
            await act(async () => user.keyboard('{Home}{ArrowLeft}'));
            await act(async () => user.click(control));
            expect(inputs[0].value).toBe('10');
            expect(inputs[1].value).toBe('30');
            expect(changes).toEqual([]);
            expect([...new FormData(form)]).toEqual([]);
            expect(form.checkValidity()).toBe(true);
        }
    );
});

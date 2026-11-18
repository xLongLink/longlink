// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Controller, useForm } from 'react-hook-form';
import { Input, Select, Slider, Textarea, Combobox, RadioGroup } from '@/components/longlink';

it.each([Input, Textarea])('resets native values without replacing the focused control or ref', async (Control) => {
    // Arrange
    const ref = vi.fn();
    await withMounted(
        <form>
            <Control name="title" label="Title" defaultValue="Original" ref={ref} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const control = output.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="title"]');

            if (!form || !control) throw new Error('Expected a native field');
            const user = userEvent.setup();
            await act(async () => user.clear(control));
            await act(async () => user.type(control, 'Edited'));
            ref.mockClear();

            // Act
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => {
                // happy-dom's form.reset() ignores cancellation.
                form.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
            });

            // Assert
            expect(control.value).toBe('Edited');
            expect(output.querySelector('[name="title"]')).toBe(control);
            expect(document.activeElement).toBe(control);
            expect(ref).not.toHaveBeenCalled();

            // Act
            await act(async () => form.reset());

            // Assert
            expect(control.value).toBe('Original');
            expect(new FormData(form).get('title')).toBe('Original');
            expect(output.querySelector('[name="title"]')).toBe(control);
            expect(document.activeElement).toBe(control);
            expect(ref).not.toHaveBeenCalled();
        }
    );
});

it.each([Select, Combobox, RadioGroup])(
    'focuses the owned control when form validation rejects an empty selection',
    async (Control) => {
        const saved: string[] = [];

        function Example() {
            const form = useForm({ defaultValues: { plan: '' } });

            return (
                <form
                    onSubmit={(event) => {
                        void form.handleSubmit((values) => {
                            saved.push(values.plan);
                        })(event);
                    }}
                    noValidate
                >
                    <Controller
                        name="plan"
                        control={form.control}
                        rules={{ required: 'Choose a plan.' }}
                        render={({ field, fieldState }) => (
                            <Control
                                name={field.name}
                                ref={field.ref}
                                onBlur={field.onBlur}
                                value={field.value}
                                onValueChange={field.onChange}
                                label="Plan"
                                error={fieldState.error?.message}
                                options={[{ value: 'team', label: 'Team' }]}
                            />
                        )}
                    />
                    <button type="submit">Save</button>
                </form>
            );
        }

        await withMounted(<Example />, async (output) => {
            const save = output.querySelector('button[type="submit"]');

            if (!save) throw new Error('Expected submit control');
            const user = userEvent.setup();
            await act(async () => user.click(save));
            expect(saved).toEqual([]);
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Choose a plan.');
            expect(document.activeElement?.matches('[role="combobox"], [role="radio"], input[type="radio"]')).toBe(
                true
            );
        });
    }
);

it.each([Select, Combobox])(
    'submits multiple values, excludes disabled fields, and restores defaults on reset',
    async (Control) => {
        await withMounted(
            <form>
                <Control
                    multiple
                    name="teams"
                    label="Teams"
                    defaultValue={['design']}
                    options={[
                        { value: 'design', label: 'Design' },
                        { value: 'engineering', label: 'Engineering' },
                        { value: 'restricted', label: 'Restricted', disabled: true }
                    ]}
                />
                <Control
                    multiple
                    name="excluded"
                    label="Unavailable"
                    defaultValue={['private']}
                    disabled
                    options={[{ value: 'private', label: 'Private' }]}
                />
                <button type="reset">Reset</button>
            </form>,
            async (output) => {
                const form = output.querySelector('form');
                const trigger = output.querySelector<HTMLElement>('[role="combobox"]');
                const reset = output.querySelector<HTMLButtonElement>('button[type="reset"]');

                if (!form || !trigger || !reset) throw new Error('Expected a multiple-selection form');
                const user = userEvent.setup();
                await act(async () => user.click(trigger));
                await vi.waitFor(() =>
                    expect(
                        Array.from(document.querySelectorAll('[role="option"]')).some(
                            (option) => option.textContent === 'Engineering'
                        )
                    ).toBe(true)
                );
                const engineering = Array.from(document.querySelectorAll('[role="option"]')).find(
                    (option) => option.textContent === 'Engineering'
                );

                if (!engineering) throw new Error('Expected Engineering option');
                await act(async () => user.click(engineering));
                await vi.waitFor(() => expect(new FormData(form).getAll('teams')).toEqual(['design', 'engineering']));
                expect(new FormData(form).has('excluded')).toBe(false);
                expect(new FormData(form).getAll('teams')).not.toContain('restricted');
                await act(async () => user.keyboard('{Escape}'));
                form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
                await act(async () => user.click(reset));
                expect(new FormData(form).getAll('teams')).toEqual(['design', 'engineering']);
                await act(async () => user.click(reset));
                await vi.waitFor(() => expect(new FormData(form).getAll('teams')).toEqual(['design']));
                expect(
                    output.querySelector('[data-slot="select-value"]')?.textContent ??
                        output.querySelector('[data-slot="combobox-chip"]')?.textContent
                ).toContain('Design');
            }
        );
    }
);

it('searches option labels, recovers from no results, and submits a value rather than the search text', async () => {
    await withMounted(
        <form>
            <Combobox
                name="assignee"
                label="Assignee"
                emptyText="No matching people"
                options={[
                    { value: 'person-42', label: 'Mara Lind' },
                    { value: 'person-93', label: 'Elena Rossi' }
                ]}
            />
        </form>,
        async (output) => {
            const input = output.querySelector<HTMLInputElement>('[role="combobox"]');
            const form = output.querySelector('form');

            if (!input || !form) throw new Error('Expected searchable selection');
            const user = userEvent.setup();
            await act(async () => user.type(input, 'Unavailable'));
            await vi.waitFor(() =>
                expect(document.querySelector('[data-slot="combobox-empty"]')?.textContent).toBe('No matching people')
            );
            expect(new FormData(form).get('assignee')).not.toBe('Unavailable');
            await act(async () => user.clear(input));
            await act(async () => user.type(input, 'Elena'));
            await vi.waitFor(() =>
                expect(document.querySelector('[data-slot="combobox-item"]')?.textContent).toBe('Elena Rossi')
            );
            await act(async () => user.keyboard('{ArrowDown}{Enter}'));
            await vi.waitFor(() => expect(new FormData(form).get('assignee')).toBe('person-93'));
            expect(input.value).toBe('Elena Rossi');
        }
    );
});

it('keeps controlled radio selection and option labels associated after a caller update', async () => {
    function Preferences() {
        const [plan, setPlan] = useState('solo');

        return (
            <form>
                <RadioGroup
                    name="plan"
                    label="Plan"
                    value={plan}
                    onValueChange={setPlan}
                    options={[
                        { value: 'solo', label: 'Solo' },
                        { value: 'unavailable', label: 'Unavailable', disabled: true },
                        { value: 'team', label: 'Team' }
                    ]}
                />
                <output>{plan}</output>
            </form>
        );
    }

    await withMounted(<Preferences />, async (output) => {
        const form = output.querySelector('form');
        const team = Array.from(output.querySelectorAll('label')).find((label) => label.textContent === 'Team');
        const solo = output.querySelector<HTMLElement>('[role="radio"]');

        if (!form || !team || !solo) throw new Error('Expected labeled plan choices');
        const user = userEvent.setup();
        await act(async () => user.click(team));
        expect(output.querySelector('output')?.textContent).toBe('team');
        expect(new FormData(form).get('plan')).toBe('team');
        await act(async () => user.keyboard('{ArrowLeft}'));
        expect(output.querySelector('output')?.textContent).toBe('solo');
        expect(new FormData(form).get('plan')).toBe('solo');
    });
});

it('keeps the first duplicate combobox option authoritative and refreshes labels when options change', async () => {
    function Example() {
        const [updated, setUpdated] = useState(false);

        return (
            <form>
                <Combobox
                    multiple
                    name="teams"
                    label="Teams"
                    defaultValue={['design', 'retired']}
                    options={[
                        { value: 'design', label: updated ? 'Product design' : 'Design', disabled: true },
                        { value: 'design', label: 'Duplicate design' },
                        { value: 'engineering', label: 'Engineering' }
                    ]}
                />
                <button type="button" onClick={() => setUpdated(true)}>
                    Refresh
                </button>
            </form>
        );
    }

    await withMounted(<Example />, async (output) => {
        const input = output.querySelector<HTMLInputElement>('[role="combobox"]');
        const form = output.querySelector('form');
        const refresh = Array.from(output.querySelectorAll('button')).find(
            (button) => button.textContent === 'Refresh'
        );

        if (!input || !form || !refresh) throw new Error('Expected team selection and refresh control');
        expect(output.querySelector('[data-slot="combobox-chip"][aria-label="Design"]')).not.toBeNull();
        expect(output.querySelector('[data-slot="combobox-chip"][aria-label="retired"]')).not.toBeNull();
        const user = userEvent.setup();
        await act(async () => user.click(input));
        await vi.waitFor(() => {
            const options = Array.from(document.querySelectorAll('[role="option"]'));
            expect(options.map((option) => option.textContent)).toEqual(['Design', 'Design', 'Engineering']);
            expect(options.slice(0, 2).every((option) => option.getAttribute('aria-disabled') === 'true')).toBe(true);
        });
        await act(async () => user.keyboard('{Escape}'));
        await act(async () => user.click(refresh));
        await vi.waitFor(() =>
            expect(output.querySelector('[data-slot="combobox-chip"][aria-label="Product design"]')).not.toBeNull()
        );
        expect(new FormData(form).getAll('teams')).toEqual(['design', 'retired']);
    });
});

it('preserves thumb focus and range values while editing the internally composed slider', async () => {
    function Range() {
        const [value, setValue] = useState([20, 80]);

        return (
            <form
                ref={(form) => {
                    for (const thumb of form?.querySelectorAll<HTMLElement>('[data-slot="slider-thumb"]') ?? []) {
                        thumb.getBoundingClientRect = () => new DOMRect(0, 0, 12, 12);
                        if (thumb.parentElement)
                            thumb.parentElement.getBoundingClientRect = () => new DOMRect(0, 0, 200, 20);
                    }
                }}
            >
                <Slider name="range" label="Budget" value={value} onValueChange={setValue} min={0} max={100} step={5} />
                <output>{value.join(',')}</output>
            </form>
        );
    }

    await withMounted(<Range />, async (output) => {
        const input = output.querySelector<HTMLInputElement>('input[type="range"]');

        if (!input) throw new Error('Expected a range slider');
        const user = userEvent.setup();
        await act(async () => user.tab());
        const focused = document.activeElement;
        await act(async () => user.keyboard('{ArrowRight}{ArrowRight}'));
        expect(output.querySelector('output')?.textContent).toBe('30,80');
        expect(document.activeElement).toBe(focused);
        expect(
            Array.from(output.querySelectorAll<HTMLInputElement>('input[type="range"]'), (thumb) => thumb.value)
        ).toEqual(['30', '80']);
    });
});

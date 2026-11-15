// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Selector } from '@/components/custom/selector';
import { MultiSelector } from '@/components/custom/multi-selector';

it.each([false, true])('keeps a rejected controlled single change out of submission, search=%s', async (hasSearch) => {
    const change = vi.fn();
    const user = userEvent.setup();

    await withMounted(
        <form>
            <Selector
                label="Owner"
                name="owner"
                value={null}
                onChange={change}
                options={['Alice', 'Bob']}
                hasSearch={hasSearch}
                required
            />
        </form>,
        async (output) => {
            const control = output.querySelector<HTMLElement>('[role="combobox"]');
            const form = output.querySelector('form');

            if (!control || !form) throw new Error('Expected owner control');

            await act(async () => user.click(control));

            const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                (item) => item.textContent === 'Bob'
            );

            if (!option) throw new Error('Expected Bob');

            await act(async () => user.click(option));
            expect(change).toHaveBeenCalledWith('Bob');
            expect(new FormData(form).getAll('owner')).toEqual(['']);
            expect(form.checkValidity()).toBe(false);
        }
    );
});

it('recovers from a required denial, clears to null, and honors canceled and completed native resets', async () => {
    const change = vi.fn();
    const user = userEvent.setup();

    await withMounted(
        <form>
            <Selector
                label="Owner"
                name="owner"
                options={['Alice', 'Bob']}
                onChange={change}
                defaultValue="Alice"
                description="Choose an owner"
                required
            />
        </form>,
        async (output) => {
            const trigger = output.querySelector<HTMLButtonElement>('button[aria-expanded]');
            const clear = output.querySelector<HTMLButtonElement>('button[aria-label="Clear Owner"]');
            const form = output.querySelector('form');

            if (!trigger || !clear || !form) throw new Error('Expected owner form');

            await act(async () => user.click(clear));
            expect(change).toHaveBeenLastCalledWith(null);
            expect(form.checkValidity()).toBe(false);
            const label = output.querySelector<HTMLLabelElement>(`label[for="${trigger.id}"]`);

            if (!label) throw new Error('Expected associated owner label');

            await act(async () => user.click(label));

            const bob = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                (option) => option.textContent === 'Bob'
            );

            if (!bob) throw new Error('Expected Bob');

            await act(async () => user.click(bob));
            expect(new FormData(form).getAll('owner')).toEqual(['Bob']);
            expect(output.querySelector('[role="alert"]')).toBeNull();
            expect(form.checkValidity()).toBe(true);
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(new FormData(form).getAll('owner')).toEqual(['Bob']);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('owner')).toEqual(['Alice']);
        }
    );
});

it('preserves other multi selections while filtering, removing chips, and resetting the form', async () => {
    const user = userEvent.setup();

    await withMounted(
        <form>
            <MultiSelector
                label="Teams"
                name="team"
                defaultValue={['support', 'locked']}
                options={[
                    {
                        type: 'section',
                        title: 'Product',
                        options: [
                            { value: 'design', label: 'Design', description: 'Design team' },
                            { value: 'development', label: 'Development' },
                            { value: 'disabled', label: 'Design locked', disabled: true }
                        ]
                    },
                    { type: 'divider' },
                    { value: 'support', label: 'Support' },
                    { value: 'locked', label: 'Locked', disabled: true }
                ]}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const search = output.querySelector<HTMLInputElement>('input[role="combobox"]');

            if (!form || !search) throw new Error('Expected teams form');

            await act(async () => user.type(search, 'unmatched'));
            expect(document.querySelector('[data-slot="combobox-empty"]')?.textContent).toBe('No results found');
            expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
            await act(async () => user.clear(search));
            await act(async () => user.type(search, 'de'));

            const design = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                (option) => option.textContent === 'DesignDesign team'
            );

            const disabled = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                (option) => option.textContent === 'Design locked'
            );

            if (!design || !disabled) throw new Error('Expected filtered team options');

            await act(async () => user.click(disabled));
            expect(new FormData(form).getAll('team')).toEqual(['support', 'locked']);
            await act(async () => user.click(design));
            expect(new FormData(form).getAll('team')).toEqual(['support', 'locked', 'design']);

            const remove = output.querySelector<HTMLButtonElement>(
                '[data-slot="combobox-chip"][aria-label="Support"] button'
            );

            if (!remove) throw new Error('Expected support removal');

            await act(async () => user.click(remove));
            expect(new FormData(form).getAll('team')).toEqual(['locked', 'design']);
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(new FormData(form).getAll('team')).toEqual(['locked', 'design']);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('team')).toEqual(['support', 'locked']);
        }
    );
});

it.each([false, true])('omits disabled fields and rejects activation, search=%s', async (hasSearch) => {
    const change = vi.fn();
    const user = userEvent.setup();

    await withMounted(
        <form>
            <Selector
                label="Owner"
                name="owner"
                value="Alice"
                options={['Alice', 'Bob']}
                onChange={change}
                hasSearch={hasSearch}
                disabled
                required
            />
            <MultiSelector
                label="Teams"
                name="team"
                value={['design', 'support']}
                options={['design', 'support']}
                onChange={change}
                disabled
                required
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const controls = output.querySelectorAll<HTMLInputElement | HTMLButtonElement>('[role="combobox"]');

            if (!form || controls.length !== 2) throw new Error('Expected disabled fields');

            for (const control of controls) {
                expect(control.disabled).toBe(true);
                await act(async () => user.click(control));
                await act(async () => user.keyboard('{ArrowDown}{Enter}'));
            }

            expect([...controls].every((control) => control.getAttribute('aria-expanded') !== 'true')).toBe(true);
            expect(change).not.toHaveBeenCalled();
            expect([...new FormData(form)]).toEqual([]);
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
        }
    );
});

it('keeps rejected chip removal and searchable clear out of controlled submission', async () => {
    const user = userEvent.setup();
    const ownerChange = vi.fn();
    const teamsChange = vi.fn();

    await withMounted(
        <form>
            <Selector label="Owner" name="owner" value="Alice" onChange={ownerChange} options={['Alice']} hasSearch />
            <MultiSelector
                label="Teams"
                name="team"
                value={['Alpha', 'Beta']}
                onChange={teamsChange}
                options={['Alpha', 'Beta']}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const clear = output.querySelector<HTMLButtonElement>('[data-slot="combobox-clear"]');

            const remove = output.querySelector<HTMLButtonElement>(
                '[data-slot="combobox-chip"][aria-label="Alpha"] button'
            );

            if (!form || !clear || !remove) throw new Error('Expected controlled fields');

            await act(async () => user.click(clear));
            expect(ownerChange).toHaveBeenCalledWith(null);
            expect(new FormData(form).getAll('owner')).toEqual(['Alice']);
            await act(async () => user.click(remove));
            expect(teamsChange).toHaveBeenCalledWith(['Beta']);
            expect(new FormData(form).getAll('team')).toEqual(['Alpha', 'Beta']);
            expect(output.querySelector('[data-slot="combobox-chip"][aria-label="Alpha"]')).not.toBeNull();
        }
    );
});

it('rejects selection after an open field is disabled without losing its submitted value when re-enabled', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    let setDisabled: (disabled: boolean) => void = () => {};

    function Access() {
        const [disabled, updateDisabled] = useState(false);
        setDisabled = updateDisabled;

        return (
            <form>
                <Selector
                    label="Owner"
                    name="owner"
                    value="Alice"
                    options={['Alice', 'Bob']}
                    hasSearch
                    disabled={disabled}
                    onChange={change}
                />
            </form>
        );
    }

    await withMounted(<Access />, async (output) => {
        const search = output.querySelector<HTMLInputElement>('input[role="combobox"]');
        const form = output.querySelector('form');

        if (!search || !form) throw new Error('Expected revocable owner field');

        await act(async () => user.click(search));
        await act(async () => user.clear(search));
        await act(async () => user.type(search, 'Bob'));

        const bob = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
            (option) => option.textContent === 'Bob'
        );

        if (!bob) throw new Error('Expected Bob');

        change.mockClear();
        await act(async () => setDisabled(true));
        await act(async () => user.click(bob));
        expect(change).not.toHaveBeenCalled();
        expect(new FormData(form).getAll('owner')).toEqual([]);
        await act(async () => setDisabled(false));
        expect(new FormData(form).getAll('owner')).toEqual(['Alice']);
    });
});

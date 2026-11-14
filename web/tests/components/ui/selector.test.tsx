// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Selector } from '@/components/custom/selector';
import { MultiSelector } from '@/components/custom/multi-selector';

it.each([false, true])('keeps a rejected controlled single change out of submission, search=%s', async (hasSearch) => {
    // A nullable controlled caller may decline both a selection and a clear request.
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
            const trigger = output.querySelector<HTMLButtonElement>('button[aria-expanded]');
            const form = output.querySelector('form');

            if (!trigger || !form) throw new Error('Expected owner control');

            await act(async () => user.click(trigger));

            const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                (item) => item.textContent === 'Bob'
            );

            if (!option) throw new Error('Expected Bob');

            await act(async () => user.click(option));
            expect(change).toHaveBeenCalledWith('Bob');
            expect(new FormData(form).getAll('owner')).toEqual(['']);
            expect(trigger.textContent).toBe('Select...');
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(false);
            expect(document.activeElement).toBe(trigger);
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
            const denied = new Event('submit', { bubbles: true, cancelable: true });
            await act(async () => form.dispatchEvent(denied));
            expect(denied.defaultPrevented).toBe(true);
            expect(output.querySelector('[role="alert"]')?.textContent).toContain('Please complete this field.');
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
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(new FormData(form).getAll('owner')).toEqual(['Bob']);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('owner')).toEqual(['Alice']);
        }
    );
});

it('selects only enabled filtered multi options, preserves other selections, and resets the search after dismissal', async () => {
    const user = userEvent.setup();

    await withMounted(
        <form>
            <MultiSelector
                label="Teams"
                name="team"
                defaultValue={['support', 'locked']}
                hasSearch
                hasSelectAll
                triggerDisplay="labels"
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
            const trigger = output.querySelector<HTMLButtonElement>('button[aria-expanded]');

            if (!form || !trigger) throw new Error('Expected teams form');

            await act(async () => user.click(trigger));
            const search = document.querySelector<HTMLInputElement>('input[aria-label="Search Teams"]');

            if (!search) throw new Error('Expected team search');

            await act(async () => user.type(search, 'unmatched'));
            expect(document.querySelector('[role="status"]')?.textContent).toBe('No results found');
            expect(document.querySelector('[role="listbox"] [role="group"]')).toBeNull();
            const clearSearch = document.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');

            if (!clearSearch) throw new Error('Expected query recovery action');

            await act(async () => user.click(clearSearch));
            await act(async () => user.type(search, 'de'));

            const selectAll = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                (option) => option.textContent === 'Select all'
            );

            if (!selectAll) throw new Error('Expected select all');

            await act(async () => user.click(selectAll));
            expect(new FormData(form).getAll('team')).toEqual(['support', 'locked', 'design', 'development']);
            expect(trigger.textContent).toBe('Support, Locked, Design, +1');
            expect(search.value).toBe('de');
            expect(document.querySelector('[role="listbox"]')).not.toBeNull();
            await act(async () => user.click(selectAll));
            expect(new FormData(form).getAll('team')).toEqual(['support', 'locked']);
            await act(async () => user.keyboard('{Escape}'));
            await act(async () => user.click(trigger));
            expect(document.querySelector<HTMLInputElement>('input[aria-label="Search Teams"]')?.value).toBe('');
            expect(document.querySelector('[role="listbox"]')?.textContent).toContain('Support');
            await act(async () => user.keyboard('{Escape}'));
            const clear = output.querySelector<HTMLButtonElement>('button[aria-label="Clear Teams"]');

            if (!clear) throw new Error('Expected multi clear');

            await act(async () => user.click(clear));
            expect(new FormData(form).getAll('team')).toEqual([]);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('team')).toEqual(['support', 'locked']);
        }
    );
});

it.each([false, true])(
    'omits disabled fields without losing focusability or accepting activation, search=%s',
    async (hasSearch) => {
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
                    hasSearch={hasSearch}
                    disabled
                    required
                />
            </form>,
            async (output) => {
                const form = output.querySelector('form');
                const triggers = output.querySelectorAll<HTMLButtonElement>('button[aria-expanded]');

                if (!form || triggers.length !== 2) throw new Error('Expected disabled fields');

                for (const trigger of triggers) {
                    trigger.focus();
                    expect(document.activeElement).toBe(trigger);
                    expect(trigger.getAttribute('aria-disabled')).toBe('true');
                    await act(async () => user.click(trigger));
                    await act(async () => user.keyboard('{ArrowDown}{Enter}'));
                }

                expect([...triggers].every((trigger) => trigger.getAttribute('aria-expanded') !== 'true')).toBe(true);

                for (const list of document.querySelectorAll('[role="listbox"]'))
                    expect(list.closest('[hidden]')).not.toBeNull();
                expect(change).not.toHaveBeenCalled();
                expect([...new FormData(form)]).toEqual([]);
                expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
            }
        );
    }
);

it('skips disabled options during keyboard selection and keeps search and select-all opt-in', async () => {
    const user = userEvent.setup();

    await withMounted(
        <form>
            <MultiSelector
                label="Teams"
                name="team"
                options={[{ value: 'locked', label: 'Locked', disabled: true }, 'Design', 'Support']}
            />
        </form>,
        async (output) => {
            const trigger = output.querySelector<HTMLButtonElement>('button[aria-expanded]');
            const form = output.querySelector('form');

            if (!trigger || !form) throw new Error('Expected teams form');

            trigger.focus();
            await act(async () => user.keyboard('{ArrowDown}'));
            expect(document.querySelector('input[placeholder="Search..."]')).toBeNull();
            expect(document.querySelector('[role="listbox"]')?.textContent).not.toContain('Select all');
            await act(async () => user.keyboard('{Enter}'));
            expect(new FormData(form).getAll('team')).toEqual(['Design']);
            expect(trigger.textContent).toContain('1 selected');
        }
    );
});

it('keeps a rejected clear controlled and displays selected badges without losing overflow values', async () => {
    const user = userEvent.setup();
    const change = vi.fn();

    await withMounted(
        <form>
            <Selector label="Owner" name="owner" value="Alice" onChange={change} options={['Alice']} />
            <MultiSelector
                label="Teams"
                name="team"
                options={['Alpha', 'Beta', 'Gamma', 'Delta']}
                triggerDisplay="badges"
                hasSelectAll
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const clearOwner = output.querySelector<HTMLButtonElement>('button[aria-label="Clear Owner"]');
            const trigger = output.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')[1];

            if (!form || !clearOwner || !trigger) throw new Error('Expected owner and teams fields');

            await act(async () => user.click(clearOwner));
            expect(change).toHaveBeenCalledWith(null);
            expect(new FormData(form).getAll('owner')).toEqual(['Alice']);
            expect(output.querySelector('button[aria-expanded]')?.textContent).toBe('Alice');
            await act(async () => user.click(trigger));

            const selectAll = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                (option) => option.textContent === 'Select all'
            );

            if (!selectAll) throw new Error('Expected select all');

            await act(async () => user.click(selectAll));
            expect([...trigger.querySelectorAll('[data-slot="badge"]')].map((badge) => badge.textContent)).toEqual([
                'Alpha',
                'Beta',
                'Gamma'
            ]);
            expect(trigger.textContent).toBe('AlphaBetaGamma+1');
            expect(new FormData(form).getAll('team')).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
        }
    );
});

it('closes a revoked picker without losing its value or reviving its old query when access returns', async () => {
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
        const trigger = output.querySelector<HTMLButtonElement>('button[aria-expanded]');
        const form = output.querySelector('form');

        if (!trigger || !form) throw new Error('Expected revocable owner field');

        await act(async () => user.click(trigger));
        const search = document.querySelector<HTMLInputElement>('input[aria-label="Search Owner"]');

        if (!search) throw new Error('Expected owner search');

        await act(async () => user.type(search, 'Bob'));
        await act(async () => setDisabled(true));
        await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
        expect(new FormData(form).getAll('owner')).toEqual([]);
        await act(async () => setDisabled(false));
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(new FormData(form).getAll('owner')).toEqual(['Alice']);
        await act(async () => user.click(trigger));
        expect(document.querySelector<HTMLInputElement>('input[aria-label="Search Owner"]')?.value).toBe('');
        expect(change).not.toHaveBeenCalled();
    });
});

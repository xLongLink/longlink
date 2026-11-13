// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { SwitchField } from '@/components/custom/SwitchField';
import { CheckboxInput } from '@/components/custom/CheckboxInput';

it('maps field names and required state onto the native checkbox', () => {
    // Act
    const output = renderStatic(<CheckboxInput name="accepted" label="Accept terms" required defaultChecked />);

    // Assert
    expect(output.querySelector('input')?.getAttribute('name')).toBe('accepted');
    expect(output.querySelector('input')?.hasAttribute('required')).toBe(true);
    expect(output.querySelector('input')?.hasAttribute('checked')).toBe(true);
});

it.each([
    ['checkbox', CheckboxInput],
    ['switch', SwitchField]
] as const)('%s serializes only checked answers and restores uncanceled local defaults', async (_, Control) => {
    // Real form reset must update both the accessible state and the successful native control.
    const user = userEvent.setup();
    const changes: boolean[] = [];

    await withMounted(
        <form>
            <Control label="Enabled" name="enabled" defaultChecked onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const control = output.querySelector('button');

            if (!form || !control) throw new Error('Expected a boolean field');
            expect(new FormData(form).getAll('enabled')).toEqual(['on']);
            await act(async () => user.click(control));
            expect(changes).toEqual([false]);
            expect(new FormData(form).has('enabled')).toBe(false);
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(control.getAttribute('aria-checked')).toBe('false');
            await act(async () => form.reset());
            expect(control.getAttribute('aria-checked')).toBe('true');
            expect(new FormData(form).getAll('enabled')).toEqual(['on']);
            expect(changes).toEqual([false]);
        }
    );
});

it.each([
    ['checkbox', CheckboxInput],
    ['switch', SwitchField]
] as const)('%s keeps controlled answers through rejected changes and reset', async (_, Control) => {
    // A caller can reject a user change without losing its saved value during native reset.
    const user = userEvent.setup();
    const changes: boolean[] = [];

    await withMounted(
        <form>
            <Control label="Enabled" name="enabled" value onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const control = output.querySelector('button');

            if (!form || !control) throw new Error('Expected a controlled boolean field');
            await act(async () => user.click(control));
            expect(changes).toEqual([false]);
            expect(control.getAttribute('aria-checked')).toBe('true');
            expect(new FormData(form).getAll('enabled')).toEqual(['on']);
            await act(async () => form.reset());
            expect(control.getAttribute('aria-checked')).toBe('true');
            expect(new FormData(form).getAll('enabled')).toEqual(['on']);
        }
    );
});

it.each([
    ['checkbox', CheckboxInput],
    ['switch', SwitchField]
] as const)('%s activates from its label and keyboard and enforces a required answer', async (_, Control) => {
    // Native validation must recover when the accessible control changes the actual submitted input.
    const user = userEvent.setup();

    await withMounted(
        <form>
            <Control label="Accept" description="Required agreement" name="accepted" required />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const control = output.querySelector('button');
            const input = output.querySelector('input');
            const label = output.querySelector('label');

            if (!form || !control || !input || !label) throw new Error('Expected a required boolean field');
            expect(form.checkValidity()).toBe(false);
            expect(output.querySelector(`[id="${control.getAttribute('aria-describedby')}"]`)?.textContent).toBe(
                'Required agreement'
            );
            await act(async () => user.click(label));
            expect(control.getAttribute('aria-checked')).toBe('true');
            expect(input.checked).toBe(true);
            expect(form.checkValidity()).toBe(true);
            await act(async () => user.keyboard(' '));
            expect(new FormData(form).has('accepted')).toBe(false);
            expect(form.checkValidity()).toBe(false);

            const description = document.getElementById(control.getAttribute('aria-describedby') ?? '');

            if (!description) throw new Error('Expected the agreement description');
            await act(async () => user.click(description));
            expect(new FormData(form).get('accepted')).toBe('on');
            expect(form.checkValidity()).toBe(true);
            expect(document.getElementById(control.getAttribute('aria-labelledby') ?? '')?.textContent).not.toContain(
                'Required agreement'
            );
        }
    );
});

it.each([
    ['checkbox', CheckboxInput],
    ['switch', SwitchField]
] as const)('%s keeps disabled answers focusable but immutable and omitted', async (_, Control) => {
    // Disabled settings remain discoverable without blocking submission or leaking saved values.
    const user = userEvent.setup();
    const changes: boolean[] = [];

    await withMounted(
        <form>
            <Control
                label="Locked"
                name="locked"
                disabled
                required
                defaultChecked
                onChange={(value) => changes.push(value)}
            />
            <Control label="Locked off" name="locked-off" disabled required />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const control = output.querySelector('button');
            const label = output.querySelector('label');

            if (!form || !control || !label) throw new Error('Expected a disabled boolean field');
            await act(async () => user.tab());
            expect(document.activeElement).toBe(control);
            expect(control.getAttribute('aria-disabled')).toBe('true');
            await act(async () => user.keyboard(' {Enter}'));
            await act(async () => user.click(label));
            expect(control.getAttribute('aria-checked')).toBe('true');
            expect(changes).toEqual([]);
            expect([...new FormData(form)]).toEqual([]);
            expect(form.checkValidity()).toBe(true);
        }
    );
});

it.each([
    ['checkbox', CheckboxInput],
    ['switch', SwitchField]
] as const)('%s inherits native disabled fieldsets for focus and mutation', async (_, Control) => {
    // Fieldset disabling must cover the visible control as well as its hidden native input.
    const user = userEvent.setup();
    const changes: boolean[] = [];

    await withMounted(
        <form>
            <fieldset disabled>
                <Control
                    label="Inherited"
                    name="inherited"
                    required
                    defaultChecked
                    onChange={(value) => changes.push(value)}
                />
            </fieldset>
            <button type="button">Next</button>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const control = output.querySelector('button');

            if (!form || !control) throw new Error('Expected an inherited disabled field');
            await act(async () => user.tab());
            expect(document.activeElement?.textContent).toBe('Next');
            await act(async () => user.click(control));
            expect(changes).toEqual([]);
            expect(control.getAttribute('aria-checked')).toBe('true');
        }
    );
});

it('preserves mixed checkbox semantics and reports a boolean when activated', async () => {
    // An indeterminate answer is not a checked form value, and rejected edits must retain mixed state.
    const user = userEvent.setup();
    const changes: boolean[] = [];

    await withMounted(
        <form>
            <CheckboxInput label="All" name="all" value="indeterminate" onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const control = output.querySelector('button');
            const input = output.querySelector('input');

            if (!form || !control || !input) throw new Error('Expected a mixed checkbox');
            expect(control.getAttribute('aria-checked')).toBe('mixed');
            expect(input.indeterminate).toBe(true);
            expect(new FormData(form).has('all')).toBe(false);
            await act(async () => user.click(control));
            expect(changes).toEqual([true]);
            expect(control.getAttribute('aria-checked')).toBe('mixed');
            expect(input.indeterminate).toBe(true);
            expect(new FormData(form).has('all')).toBe(false);
        }
    );
});

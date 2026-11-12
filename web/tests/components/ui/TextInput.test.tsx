// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { TextInput } from '@/components/ui/TextInput';
import { renderStatic, withMounted } from '../../render';

it('preserves authored default values and submission names', () => {
    // Act
    const output = renderStatic(<TextInput label="Name" name="name" defaultValue="  Acme  " />);

    // Assert
    expect(output.querySelector('input[name="name"]')?.getAttribute('value')).toBe('  Acme  ');
    expect(output.querySelector('input')?.getAttribute('type')).toBe('text');
});

it('associates the visible label and description with the actual editable control', () => {
    // Render two fields to catch duplicate generated IDs as well as missing associations.
    const output = renderStatic(
        <>
            <TextInput label="Email" description="Work address" name="email" type="email" autoComplete="email" />
            <TextInput label="Password" name="password" type="password" startIcon={<svg data-start-icon />} />
        </>
    );

    const inputs = output.querySelectorAll('input');

    // Both labels target their native inputs; descriptive text stays out of the accessible name.
    expect([...output.querySelectorAll('label')].map((label) => label.htmlFor)).toEqual(
        [...inputs].map((input) => input.id)
    );
    expect(inputs[0]?.id).not.toBe(inputs[1]?.id);
    expect(output.querySelector(`[id="${inputs[0]?.getAttribute('aria-describedby')}"]`)?.textContent).toBe(
        'Work address'
    );
    expect(inputs[0]?.autocomplete).toBe('email');
    expect(inputs[1]?.type).toBe('password');
    expect(output.querySelector('[data-start-icon]')?.parentElement?.getAttribute('aria-hidden')).toBe('true');
});

it('edits, clears without submitting, and restores authored defaults on an uncanceled form reset', async () => {
    // Use the real input and ancestor form to verify state and native serialization together.
    const changes: string[] = [];
    const user = userEvent.setup();

    await withMounted(
        <form>
            <TextInput label="Name" name="name" defaultValue="Acme" onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');
            const clear = output.querySelector('button');

            if (!form || !input || !clear) throw new Error('Expected the editable field and clear action');

            // Clearing uses the same caller callback, retains focus, and never submits the form.
            let submissions = 0;
            form.addEventListener('submit', () => submissions++);
            await act(async () => user.click(clear));
            expect(input.value).toBe('');
            expect(new FormData(form).getAll('name')).toEqual(['']);
            expect(changes).toEqual(['']);
            expect(document.activeElement).toBe(input);
            expect(output.querySelector('button')).toBeNull();
            expect(submissions).toBe(0);

            // Editing and canceled reset retain the actual draft; ordinary reset restores the authored value.
            await act(async () => user.type(input, '  Draft  '));
            expect(new FormData(form).get('name')).toBe('  Draft  ');
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(input.value).toBe('  Draft  ');
            await act(async () => form.reset());
            expect(input.value).toBe('Acme');
        }
    );
});

it('reports controlled edits and clear requests without taking ownership of the caller value', async () => {
    // A controlled parent can deliberately decline a clear request.
    const changes: string[] = [];
    const user = userEvent.setup();

    await withMounted(
        <TextInput label="Name" value="saved" onChange={(value) => changes.push(value)} />,
        async (output) => {
            const input = output.querySelector('input');
            const clear = output.querySelector('button');

            if (!input || !clear) throw new Error('Expected the controlled field');
            await act(async () => user.click(clear));
            expect(changes).toEqual(['']);
            expect(input.value).toBe('saved');

            // Rejected typing must not replace the controlled value or lose the caller's change request.
            await act(async () => user.type(input, 'x'));
            expect(changes).toEqual(['', 'savedx']);
            expect(input.value).toBe('saved');
        }
    );
});

it('keeps clear keyboard-accessible without submitting the form', async () => {
    // Keyboard users can reach the clear action and return directly to editing.
    const user = userEvent.setup();

    await withMounted(
        <form>
            <TextInput label="Search" name="search" defaultValue="query" />
        </form>,
        async (output) => {
            const input = output.querySelector('input');
            const clear = output.querySelector('button');

            if (!input || !clear) throw new Error('Expected the search field and clear action');
            await act(async () => user.tab());
            expect(document.activeElement).toBe(input);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(clear);
            await act(async () => user.keyboard('{Enter}'));
            expect(input.value).toBe('');
            expect(document.activeElement).toBe(input);
        }
    );
});

it('validates whitespace and Unicode code-point limits without truncation, then recovers after editing', async () => {
    // The supplementary-plane emoji is one Python character, despite occupying two UTF-16 code units.
    const user = userEvent.setup();

    await withMounted(
        <form>
            <TextInput label="Name" name="name" required maxLength={1} defaultValue="😀" />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');

            if (!form || !input) throw new Error('Expected the validated field');

            // The real FormField submission listener accepts the code point boundary.
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
            expect(input.hasAttribute('maxlength')).toBe(false);
            await act(async () => user.type(input, 'a'));
            expect(input.value).toBe('😀a');
            await act(async () => {
                expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(false);
            });
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Use no more than 1 characters.');
            expect(new FormData(form).get('name')).toBe('😀a');

            // Required validation rejects blank text, and stale failure feedback disappears after a valid edit.
            await act(async () => user.clear(input));
            await act(async () => user.type(input, ' '));
            await act(async () => {
                expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(false);
            });
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Please complete this field.');
            await act(async () => user.clear(input));
            await act(async () => user.type(input, 'A'));
            expect(output.querySelector('[role="alert"]')).toBeNull();
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
        }
    );
});

it('keeps disabled fields keyboard-discoverable without editing or submitting their saved draft', async () => {
    // Disabled state preserves focus discovery while excluding values and all editing actions.
    const enters: string[] = [];
    const changes: string[] = [];
    const user = userEvent.setup();

    await withMounted(
        <form>
            <TextInput
                label="Disabled"
                name="disabled"
                defaultValue="saved"
                disabled
                onEnter={() => enters.push('disabled')}
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');

            if (!form || !input) throw new Error('Expected the disabled fields');
            expect(input.disabled).toBe(false);
            expect(input.readOnly).toBe(true);
            expect(input.getAttribute('aria-disabled')).toBe('true');
            expect(input.hasAttribute('name')).toBe(false);
            expect(output.querySelector('button[aria-label="Clear Disabled"]')).toBeNull();
            await act(async () => user.tab());
            expect(document.activeElement).toBe(input);
            await act(async () => user.keyboard('changed'));

            // Preventing the key's default also blocks implicit native form submission.
            const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
            await act(async () => {
                expect(input.dispatchEvent(enter)).toBe(false);
            });
            expect(enter.defaultPrevented).toBe(true);
            expect(input.value).toBe('saved');
            expect(changes).toEqual([]);
            expect(enters).toEqual([]);
            expect([...new FormData(form)]).toEqual([]);
        }
    );
});

it('retains native disabled fieldset inheritance for focus, editing, and validation', async () => {
    // A disabled ancestor must still disable both the input and its clear action natively.
    const user = userEvent.setup();
    const changes: string[] = [];

    await withMounted(
        <form>
            <fieldset disabled>
                <TextInput
                    label="Inherited"
                    name="inherited"
                    defaultValue="saved"
                    required
                    maxLength={1}
                    onChange={(value) => changes.push(value)}
                />
            </fieldset>
            <button type="button">Next</button>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');
            const clear = output.querySelector('button[aria-label="Clear Inherited"]');

            if (!form || !input || !clear) throw new Error('Expected the inherited disabled field');
            await act(async () => user.tab());
            expect(document.activeElement?.textContent).toBe('Next');
            await act(async () => user.type(input, 'changed'));
            await act(async () => user.click(clear));
            expect(input.value).toBe('saved');
            expect(changes).toEqual([]);
            await act(async () => {
                expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
            });
            expect(output.querySelector('[role="alert"]')).toBeNull();
        }
    );
});

it('runs onEnter for explicit Enter presses but not IME composition commits', async () => {
    // Enter commits during composition must not trigger save or search actions prematurely.
    let enters = 0;

    await withMounted(<TextInput label="Search" onEnter={() => enters++} />, async (output) => {
        const input = output.querySelector('input');

        if (!input) throw new Error('Expected the search input');
        await act(async () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true }));
        });
        expect(enters).toBe(0);
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        expect(enters).toBe(1);
    });
});

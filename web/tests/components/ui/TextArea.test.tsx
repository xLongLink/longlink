// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { TextArea } from '@/components/ui/TextArea';
import userEvent from '@testing-library/user-event';
import { TextInput } from '@/components/ui/TextInput';
import { renderStatic, withMounted } from '../../render';

it('retains multiline content under its native submission name', () => {
    // Act
    const output = renderStatic(<TextArea label="Notes" name="notes" defaultValue={'First\nSecond'} />);

    // Assert
    expect(output.querySelector('textarea[name="notes"]')?.textContent).toBe('First\nSecond');
    expect(output.querySelector('textarea')?.getAttribute('rows')).toBe('3');
});

it.each([
    ['textarea', TextArea],
    ['text input', TextInput]
] as const)('focuses the %s from its description without adding that description to its name', async (_, Control) => {
    const user = userEvent.setup();

    await withMounted(
        <>
            <Control label="Notes" description="Internal notes" name="notes" />
            <button type="button">Elsewhere</button>
        </>,
        async (output) => {
            const control = output.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
            const other = output.querySelector('button');

            if (!control || !other) throw new Error('Expected the editable control');
            const description = document.getElementById(control.getAttribute('aria-describedby') ?? '');

            if (!description) throw new Error('Expected the notes description');
            await act(async () => user.click(other));
            await act(async () => user.click(description));
            expect(document.activeElement).toBe(control);
            expect(document.getElementById(control.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Notes');
        }
    );
});

it('edits multiline values and respects canceled and ordinary resets', async () => {
    // Native serialization and reset must agree with the visible local draft.
    const user = userEvent.setup();

    await withMounted(
        <form>
            <TextArea label="Notes" description="Internal notes" name="notes" defaultValue={'First\nSecond'} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('textarea');
            const label = output.querySelector('label');

            if (!form || !input || !label) throw new Error('Expected a multiline field');
            expect(label.htmlFor).toBe(input.id);
            expect(output.querySelector(`[id="${input.getAttribute('aria-describedby')}"]`)?.textContent).toBe(
                'Internal notes'
            );
            await act(async () => user.type(input, '{Enter}Third'));
            expect(new FormData(form).get('notes')).toBe('First\nSecond\nThird');
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(input.value).toBe('First\nSecond\nThird');
            await act(async () => form.reset());
            expect(input.value).toBe('First\nSecond');
            expect(new FormData(form).get('notes')).toBe('First\nSecond');
        }
    );
});

it('keeps caller-owned content through rejected edits and native reset', async () => {
    // Reset and editing cannot silently replace content the parent still owns.
    const user = userEvent.setup();
    const changes: string[] = [];

    await withMounted(
        <form>
            <TextArea label="Notes" name="notes" value="saved" onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('textarea');

            if (!form || !input) throw new Error('Expected a controlled multiline field');
            await act(async () => user.type(input, 'x'));
            expect(changes).toEqual(['savedx']);
            expect(input.value).toBe('saved');
            await act(async () => form.reset());
            expect(new FormData(form).get('notes')).toBe('saved');
        }
    );
});

it('validates nonblank text and Unicode code points without truncating, then recovers', async () => {
    // Astral code points count once, but a combining sequence still counts as two Python characters.
    const user = userEvent.setup();

    await withMounted(
        <form>
            <TextArea label="Notes" name="notes" required maxLength={1} defaultValue="😀" />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('textarea');

            if (!form || !input) throw new Error('Expected a validated multiline field');
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
            expect(input.hasAttribute('maxlength')).toBe(false);
            await act(async () => user.clear(input));
            await act(async () => user.type(input, 'é'));
            await act(async () => {
                expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(false);
            });
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Use no more than 1 characters.');
            expect(new FormData(form).get('notes')).toBe('é');
            await act(async () => user.clear(input));
            await act(async () => user.type(input, ' {Enter}'));
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

it('keeps disabled content discoverable but not editable, serialized, or validated', async () => {
    // A disabled required field cannot prevent saving the rest of the form.
    const user = userEvent.setup();
    const changes: string[] = [];

    await withMounted(
        <form>
            <TextArea
                label="Locked"
                name="locked"
                defaultValue="saved"
                disabled
                required
                maxLength={1}
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('textarea');

            if (!form || !input) throw new Error('Expected a disabled multiline field');
            await act(async () => user.tab());
            expect(document.activeElement).toBe(input);
            expect(input.readOnly).toBe(true);
            expect(input.getAttribute('aria-disabled')).toBe('true');
            await act(async () => user.type(input, 'changed'));
            expect(changes).toEqual([]);
            expect(input.value).toBe('saved');
            expect([...new FormData(form)]).toEqual([]);
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
        }
    );
});

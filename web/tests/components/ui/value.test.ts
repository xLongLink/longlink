import { it, expect } from 'vitest';
import { withMounted } from '../../render';
// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { useValue } from '@/components/custom/value';

it('reports controlled edits without changing the caller-owned value', async () => {
    // Arrange
    const changes: string[] = [];

    function Probe() {
        const field = useValue('saved', 'default', (value) => changes.push(value));

        return createElement('button', { onClick: () => field.onChange('edited') }, field.value);
    }

    // Act
    await withMounted(createElement(Probe), async (output) => {
        await act(async () => output.querySelector('button')?.click());

        // Assert
        expect(changes).toEqual(['edited']);
        expect(output.textContent).toBe('saved');
    });
});

it('preserves an edited local value when reset is canceled and restores the default on the next reset', async () => {
    // Arrange a local control bound to its real ancestor form.
    function Probe() {
        const field = useValue<string>(undefined, 'default');

        return createElement(
            'section',
            { ref: field.ref },
            createElement('button', { type: 'button', onClick: () => field.onChange('edited') }, field.value)
        );
    }

    await withMounted(createElement('form', null, createElement(Probe)), async (output) => {
        const form = output.querySelector('form');
        const button = output.querySelector('button');

        if (!form || !button) throw new Error('Expected the local control form');

        // A reset listener can cancel the native event after the control receives it.
        await act(async () => button.click());
        form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
        await act(async () => form.reset());
        expect(button.textContent).toBe('edited');

        // An uncanceled reset still restores the initial local value.
        await act(async () => form.reset());
        expect(button.textContent).toBe('default');
    });
});

// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../render';
import { Form } from '@/components/ui/Form';
import { TextInput } from '@/components/ui/TextInput';

it('prevents submission when the caller disables the final mutation', async () => {
    // Arrange
    const submissions: FormData[] = [];

    // Act
    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
            submitDisabled
        >
            <TextInput label="Name" name="name" defaultValue="Acme" />
        </Form>,
        async (output) => {
            // Require a submission target so missing markup cannot pass silently.
            const form = output.querySelector('form');

            if (!form) throw new Error('Expected Form to render a form element');

            await act(async () => {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });

            // Assert
            expect(submissions).toEqual([]);
        }
    );
});

// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../../../render';
import userEvent from '@testing-library/user-event';
import { TextInput } from '@/components/custom/text-input';
import { FormRequestContext } from '@/components/custom/contexts';
import FormPreview from '@/platform/routes/docs/sdk/views/form-preview';

it('keeps edited fields local when a preview form is submitted', async () => {
    const user = userEvent.setup();
    const request = vi.fn().mockResolvedValue({});

    await withMounted(
        <FormRequestContext value={request}>
            <FormPreview>
                <TextInput label="Name" name="name" defaultValue="New order" />
            </FormPreview>
        </FormRequestContext>,
        async (output) => {
            const input = output.querySelector<HTMLInputElement>('input[name="name"]');
            const form = output.querySelector('form');

            if (!input || !form) throw new Error('Expected editable preview form');

            await act(async () => user.clear(input));
            await act(async () => user.type(input, 'Replacement order'));
            const submission = new Event('submit', { bubbles: true, cancelable: true });

            await act(async () => {
                form.dispatchEvent(submission);
            });

            expect(submission.defaultPrevented).toBe(true);
            expect(request).not.toHaveBeenCalled();
            expect(input.value).toBe('Replacement order');
        }
    );
});

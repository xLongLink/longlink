// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { Input } from '@/components/shadcn/input';
import { withMounted } from '../../../../../render';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';
import FormDocumentation from '@/platform/routes/docs/sdk/views/form-documentation';

it('keeps edited fields local when a preview form is submitted', async () => {
    // Arrange
    const user = userEvent.setup();
    const request = vi.fn().mockResolvedValue({});

    await withMounted(
        <RequestContext value={{ request, download: vi.fn() }}>
            <FormDocumentation
                name="Input"
                preview={<Input aria-label="Name" name="name" defaultValue="New order" />}
                code='<Input name="name" defaultValue="New order" />'
            />
        </RequestContext>,
        async (output) => {
            const input = output.querySelector<HTMLInputElement>('input[name="name"]');
            const form = output.querySelector('form');

            if (!input || !form) throw new Error('Expected editable preview form');

            // Act
            await act(async () => user.clear(input));
            await act(async () => user.type(input, 'Replacement order'));
            const submission = new Event('submit', { bubbles: true, cancelable: true });

            await act(async () => {
                form.dispatchEvent(submission);
            });

            // Assert
            expect(submission.defaultPrevented).toBe(true);
            expect(request).not.toHaveBeenCalled();
            expect(input.value).toBe('Replacement order');
        }
    );
});

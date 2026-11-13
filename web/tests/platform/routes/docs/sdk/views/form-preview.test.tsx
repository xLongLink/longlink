// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../../../../render';
import { TextInput } from '@/components/custom/text-input';
import FormPreview from '@/platform/routes/docs/sdk/views/form-preview';

it('displays submitted example fields without sending a Platform request', async () => {
    // Act
    await withMounted(
        <FormPreview>
            <TextInput label="Name" name="name" defaultValue="Acme" />
        </FormPreview>,
        async (output) => {
            await act(async () => {
                output.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });

            // Assert
            const status = [...output.querySelectorAll('[role="status"]')].find((element) =>
                element.textContent?.includes('Submitted fields')
            );

            expect(status).toBeDefined();
            expect(status?.textContent).toContain('Acme');
        }
    );
});

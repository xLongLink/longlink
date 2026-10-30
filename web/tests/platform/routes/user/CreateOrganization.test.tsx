// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../../render';
import CreateOrganization from '@/platform/routes/user/CreateOrganization';

it('validates a required Organization name before creation', async () => {
    // Act
    await withMounted(<CreateOrganization onClose={() => undefined} invalidate={async () => undefined} />, async () => {
        const dialog = document.querySelector('dialog');

        // Assert
        expect(dialog?.textContent).toContain('New organization');
        expect(dialog?.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
        expect(dialog?.querySelector('input[name="name"]')?.getAttribute('aria-required')).toBe('true');

        // Submit the blank draft through the real form validation boundary.
        await act(async () => {
            dialog?.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe('Please complete this field.');
    });
});

// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import { Form } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import userEvent from '@testing-library/user-event';
import { TextInput } from '@/components/ui/TextInput';
import { Step, Stepper } from '@/components/ui/Stepper';

it('preserves step drafts through navigation, final validation, submission, and reset', async () => {
    // Arrange
    const submissions: [string, FormDataEntryValue][][] = [];
    const user = userEvent.setup();

    // Act
    await withMounted(
        <Form
            action={(data) => {
                submissions.push([...data.entries()]);
            }}
        >
            <Stepper variant="wizard">
                <Step label="Customer">
                    <TextInput label="Customer" name="customer" required />
                </Step>
                <Step label="Notes">
                    <TextInput label="Notes" name="notes" />
                    <Button type="submit" label="Save" name="intent" value="save" />
                </Step>
            </Stepper>
        </Form>,
        async (output) => {
            const form = output.querySelector('form');
            const customer = output.querySelector<HTMLInputElement>('input[name="customer"]');
            const notes = output.querySelector<HTMLInputElement>('input[name="notes"]');

            if (!form || !customer || !notes) throw new Error('Expected persistent form fields');

            /** Finds an actual navigation or submission control. */
            function button(label: string) {
                const control = Array.from(output.querySelectorAll('button')).find(
                    (item) => item.textContent === label
                );

                if (!control) throw new Error(`Expected ${label} button`);

                return control;
            }

            // Hidden fields remain enabled and Enter cannot submit an intermediate panel.
            expect(notes.closest('fieldset')?.hidden).toBe(true);
            expect(notes.matches(':disabled')).toBe(false);
            await act(async () => {
                form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
            });
            expect(submissions).toEqual([]);
            expect(customer.closest('fieldset')?.hidden).toBe(false);

            // Next validates only the current panel and preserves its draft when advancing.
            await act(async () => user.type(customer, 'Acme'));
            await act(async () => button('Next').click());
            expect(notes.closest('fieldset')?.hidden).toBe(false);
            await act(async () => user.type(notes, 'Deliver tomorrow'));

            // Final validation reveals an invalid earlier panel before focusing its field.
            customer.setCustomValidity('Please review the customer');
            await act(async () => {
                form.dispatchEvent(
                    new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button('Save') })
                );
            });
            expect(submissions).toEqual([]);
            expect(customer.closest('fieldset')?.hidden).toBe(false);
            expect(document.activeElement).toBe(customer);
            customer.setCustomValidity('');

            // One final write includes both panels and the submitter, then reset restores the first step.
            await act(async () => button('Next').click());
            await act(async () => {
                form.dispatchEvent(
                    new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button('Save') })
                );
            });
            expect(submissions).toEqual([
                [
                    ['customer', 'Acme'],
                    ['notes', 'Deliver tomorrow'],
                    ['intent', 'save'],
                ],
            ]);
            await act(async () => form.reset());
            expect(customer.closest('fieldset')?.hidden).toBe(false);
            expect(customer.value).toBe('');
            expect(notes.value).toBe('');
        }
    );
});

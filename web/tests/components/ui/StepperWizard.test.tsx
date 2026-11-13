// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { Form } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import userEvent from '@testing-library/user-event';
import { TextInput } from '@/components/ui/TextInput';
import { Step, Wizard } from '@/components/custom/Wizard';

/** Lets the owner accept navigation independently of the wizard's request. */
function ControlledWizard({ onStepClick }: { onStepClick: (index: number) => void }) {
    const [activeStep, setActiveStep] = useState(1);

    return (
        <>
            <button type="button" onClick={() => setActiveStep(0)}>
                Select draft
            </button>
            <button type="button" onClick={() => setActiveStep(1)}>
                Select review
            </button>
            <Wizard activeStep={activeStep} onStepClick={onStepClick}>
                <Step label="Draft">
                    <input name="draft" defaultValue="Retained" />
                </Step>
                <Step label="Review">
                    <input name="review" />
                </Step>
            </Wizard>
        </>
    );
}

it('leaves controlled selection with its owner and preserves drafts when the owner changes it', async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();

    await withMounted(<ControlledWizard onStepClick={onStepClick} />, async (output) => {
        const panels = output.querySelectorAll('fieldset');
        const draft = output.querySelector<HTMLInputElement>('input[name="draft"]');
        const buttons = Array.from(output.querySelectorAll('button'));
        const back = buttons.find((button) => button.textContent === 'Back');
        const selectDraft = buttons.find((button) => button.textContent === 'Select draft');
        const selectReview = buttons.find((button) => button.textContent === 'Select review');

        if (!draft || !back || !selectDraft || !selectReview) throw new Error('Expected controlled wizard controls');

        expect(panels[0].hidden).toBe(true);
        expect(panels[1].hidden).toBe(false);
        await act(async () => user.click(selectDraft));
        await act(async () => user.clear(draft));
        await act(async () => user.type(draft, 'Unsaved details'));
        await act(async () => user.click(selectReview));
        await act(async () => user.click(back));
        expect(onStepClick).toHaveBeenCalledExactlyOnceWith(0);
        expect(panels[1].hidden).toBe(false);
        await act(async () => user.click(selectDraft));
        expect(panels[0].hidden).toBe(false);
        expect(document.activeElement).toBe(panels[0]);
        expect(output.querySelector('input[name="draft"]')).toBe(draft);
        expect(draft.value).toBe('Unsaved details');
    });
});

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
            <Wizard>
                <Step label="Customer">
                    <TextInput label="Customer" name="customer" required />
                </Step>
                <Step label="Notes">
                    <TextInput label="Notes" name="notes" />
                    <Button variant="outline" type="submit" name="intent" value="save">
                        Save
                    </Button>
                </Step>
            </Wizard>
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
                    ['intent', 'save']
                ]
            ]);
            await act(async () => form.reset());
            expect(customer.closest('fieldset')?.hidden).toBe(false);
            expect(customer.value).toBe('');
            expect(notes.value).toBe('');
        }
    );
});

it('guards pending actions, announces failure, and permits retry without losing drafts', async () => {
    // Keep the domain action pending while duplicate submit events arrive.
    let rejectAction: (error: Error) => void = () => {};

    const action = vi.fn(
        () =>
            new Promise<void | boolean>((_resolve, reject) => {
                rejectAction = reject;
            })
    );

    const cancel = vi.fn();
    await withMounted(
        <form>
            <Wizard
                height={400}
                onCancel={cancel}
                next={() => ({ label: 'Check', action })}
                finalAction={
                    <Button variant="outline" type="submit">
                        Finish
                    </Button>
                }
            >
                <Step label="Draft">
                    <input name="draft" defaultValue="Retained" />
                </Step>
                <Step label="Review">
                    <input name="review" />
                </Step>
            </Wizard>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const panels = output.querySelectorAll('fieldset');
            const draft = output.querySelector<HTMLInputElement>('input[name="draft"]');

            const check = Array.from(output.querySelectorAll('button')).find(
                (button) => button.textContent === 'Check'
            );

            if (!form || !draft || !check) throw new Error('Expected wizard controls');

            await act(async () => check.click());
            await act(async () => {
                form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
            });
            expect(action).toHaveBeenCalledOnce();
            expect(panels[0].disabled).toBe(true);
            expect(panels[1].hidden).toBe(true);
            expect(
                Array.from(output.querySelectorAll('button')).find((button) => button.textContent === 'Cancel')
                    ?.disabled
            ).toBe(true);

            // A rejected action releases the guard and leaves a visible, announced recovery path.
            await act(async () => rejectAction(new Error('Review unavailable')));
            expect(output.querySelector('[aria-live="assertive"]')?.textContent).toBe('Review unavailable');
            expect(panels[0].disabled).toBe(false);
            expect(draft.value).toBe('Retained');
            action.mockRejectedValueOnce(new DOMException('Canceled', 'AbortError'));
            await act(async () => check.click());
            expect(output.querySelector('[aria-live="assertive"]')?.textContent).toBe('');
            expect(panels[0].hidden).toBe(false);
            expect(panels[0].disabled).toBe(false);
            action.mockImplementation(async () => false);
            await act(async () => check.click());
            expect(panels[0].hidden).toBe(false);
            expect(panels[0].disabled).toBe(false);
            action.mockImplementation(async () => {});
            await act(async () => check.click());
            expect(panels[1].hidden).toBe(false);
            expect(document.activeElement).toBe(panels[1]);
            expect(output.querySelector('[aria-live="assertive"]')?.textContent).toBe('');
            expect(output.textContent).toContain('Finish');

            // Back keeps the same mounted draft, and Cancel remains the caller's action.
            const back = Array.from(output.querySelectorAll('button')).find((button) => button.textContent === 'Back');
            await act(async () => back?.click());
            expect(panels[0].hidden).toBe(false);
            expect(output.querySelector('input[name="draft"]')).toBe(draft);
            await act(async () =>
                Array.from(output.querySelectorAll('button'))
                    .find((button) => button.textContent === 'Cancel')
                    ?.click()
            );
            expect(cancel).toHaveBeenCalledOnce();
        }
    );
});

it('ignores completion from before a reset without advancing or unlocking a newer action', async () => {
    // Reset invalidates in-flight navigation; an old result must not affect the fresh draft.
    let finishOld: () => void = () => {};

    let finishCurrent: () => void = () => {};

    const oldAction = new Promise<void>((resolve) => {
        finishOld = resolve;
    });

    const currentAction = new Promise<void>((resolve) => {
        finishCurrent = resolve;
    });

    const action = vi.fn().mockReturnValueOnce(oldAction).mockReturnValueOnce(currentAction);

    try {
        await withMounted(
            <form>
                <Wizard next={() => ({ label: 'Check', action })}>
                    <Step label="Draft">
                        <input name="draft" defaultValue="Original" />
                    </Step>
                    <Step label="Review">Review</Step>
                </Wizard>
            </form>,
            async (output) => {
                const form = output.querySelector('form');
                const panels = output.querySelectorAll('fieldset');

                const check = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Check'
                );

                if (!form || !check) throw new Error('Expected resettable wizard');

                await act(async () => check.click());
                await act(async () => form.reset());
                expect(panels[0].disabled).toBe(false);
                await act(async () => check.click());
                expect(action).toHaveBeenCalledTimes(2);
                await act(async () => finishOld());
                expect(panels[0].hidden).toBe(false);
                expect(panels[0].disabled).toBe(true);
                await act(async () => finishCurrent());
                expect(panels[1].hidden).toBe(false);
                expect(panels[1].disabled).toBe(false);
            }
        );
    } finally {
        finishOld();
        finishCurrent();
    }
});

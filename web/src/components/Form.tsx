import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { FormStep } from './ui/FormStep';
import { Step, Stepper } from './ui/Stepper';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import type { FormValidation } from './ui/FormField';
import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement, useEffect, useRef, useState } from 'react';
import { Layout, LayoutHeader, LayoutContent } from '@astryxdesign/core/Layout';

export { FormStep };

/** Owns validation, navigation, pending state, and errors for native and Solution forms. */
export function Form(props: {
    /** Hides the form while keeping its fields mounted and enabled for submission and validation. */
    hidden?: boolean;
    /** Named controls and layout, or direct FormStep children for automatic navigation. Next validates the current step and shared fields; final submission validates all steps and reveals the first invalid field. Inactive fields remain mounted and enabled. */
    children?: ReactNode;
    /** Performs the final write after validating and collecting all enabled fields. */
    action: (data: FormData) => void | Promise<void>;
    /** Native form ID for associating external submit or reset buttons. */
    id?: string;
    /** Bounds a wizard frame, pinning progress above its centered, scrollable content. */
    height?: number | string;
    /** Label for the automatic final submit button when using FormStep children; defaults to Save. */
    submitLabel?: string;
    /** Runs before advancing a validated step; false keeps the current step open. */
    onNext?: (step: number) => void | boolean | Promise<void | boolean>;
    /** Overrides Next for steps with an intermediate action, such as image inspection. */
    nextLabel?: (step: number) => string;
    /** Disables the final submission when domain requirements are not satisfied. */
    submitDisabled?: boolean;
    /** Shows a cancel action beside the automatic navigation controls. */
    onCancel?: () => void;
}) {
    // Guard writes and asynchronous advances independently of React render timing.
    const pending = useRef(false);
    const [submission, setSubmission] = useState<{ submitting: boolean; error?: string }>({ submitting: false });

    // Recognize direct marker children, retaining other content as shared fields or layout.
    const children = Children.toArray(props.children);

    const steps = children.filter(
        (child): child is ReactElement<Parameters<typeof FormStep>[0]> =>
            isValidElement<Parameters<typeof FormStep>[0]>(child) && child.type === FormStep
    );

    // Keep navigation local while allowing the author to change the number of steps.
    const [step, setStep] = useState(0);
    const activeStep = Math.min(step, Math.max(steps.length - 1, 0));
    const [failure, setFailure] = useState<{ control: HTMLElement } | null>(null);

    // Reveal an invalid panel before focusing its control and presenting native validation feedback.
    useEffect(() => {
        if (!failure) return;
        failure.control.focus();

        if (
            failure.control instanceof HTMLInputElement ||
            failure.control instanceof HTMLSelectElement ||
            failure.control instanceof HTMLTextAreaElement
        ) {
            failure.control.reportValidity();
        }
    }, [failure]);

    /** Validates native and themed controls in scope, then opens the first invalid step. */
    function validate(form: HTMLFormElement, final: boolean) {
        // Next validates shared fields and the current panel; Save validates every enabled field.
        const invalid: HTMLElement[] = [];

        // Native controls expose constraints without displaying errors on still-hidden panels.
        const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            'input, select, textarea'
        );

        for (const control of controls) {
            const panel = control.closest<HTMLElement>('[data-form-step]');

            if (!final && panel && Number(panel.dataset.formStep) !== activeStep) continue;

            if (control.willValidate && !control.validity.valid) invalid.push(control);
        }

        // Use the same scoped pass for themed controls, including shared fields outside steps.
        const validation: FormValidation = { scope: form, step: final ? undefined : activeStep, invalid };

        form.dispatchEvent(new CustomEvent('longlink:validate', { detail: validation, cancelable: true }));

        // Order mixed native and themed failures by their actual field position, not listener order.
        invalid.sort((left, right) =>
            left === right ? 0 : left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
        );
        const first = invalid[0];

        if (!first) return true;

        const panel = first.closest<HTMLElement>('[data-form-step]');

        if (panel) setStep(Number(panel.dataset.formStep));
        setFailure({ control: first });

        return false;
    }

    /** Runs the asynchronous request after the native submit event has been intercepted. */
    async function submit(form: HTMLFormElement, submitter: HTMLElement | null, final: boolean) {
        // Guard synchronously so repeated submits cannot race a React state update.
        if (pending.current) return;
        pending.current = true;

        // Serialize before disabling fields, preserving repeated names, files, and the submitter.
        try {
            const data = final ? new FormData(form, submitter) : null;
            setSubmission({ submitting: true });

            // Complete intermediate work before advancing; failed inspection retains the current panel and draft.
            if (!final) {
                const advance = await props.onNext?.(activeStep);

                if (advance !== false) setStep(activeStep + 1);
            } else if (data) {
                await props.action(data);
            }
        } catch (failure) {
            setSubmission((current) => ({
                ...current,
                error: failure instanceof Error ? failure.message : 'Form submission failed',
            }));
        } finally {
            pending.current = false;
            setSubmission((current) => ({ ...current, submitting: false }));
        }
    }

    // Keep progress separate from the content so a bounded wizard can pin it in its header.
    const progress = (
        <Stepper activeStep={activeStep}>
            {steps.map((child, index) => (
                <Step key={child.key} step={index} label={child.props.label} />
            ))}
        </Stepper>
    );

    // Reuse the same persistent panels and navigation in inline forms and bounded dialogs.
    const content = (
        <Stack gap={steps.length > 0 ? 4 : 3}>
            {steps.length === 0
                ? props.children
                : children.map((child) => {
                      // Keep all step fields mounted and enabled so final serialization remains complete.
                      const index = steps.findIndex((candidate) => candidate === child);

                      if (index < 0) return child;

                      return (
                          <fieldset
                              key={steps[index].key}
                              data-form-step={index}
                              hidden={index !== activeStep}
                              className="m-0 min-w-0 border-0 p-0"
                              aria-label={steps[index].props.label}
                          >
                              {steps[index].props.children}
                          </fieldset>
                      );
                  })}
            {steps.length > 0 && (
                <Stack direction="horizontal" justify="between" align="center" gap={2}>
                    <Stack direction="horizontal" gap={2}>
                        {props.onCancel && <Button label="Cancel" variant="ghost" onClick={props.onCancel} />}
                        <Button
                            label="Back"
                            variant="secondary"
                            hidden={Boolean(props.onCancel) && activeStep === 0}
                            disabled={activeStep === 0}
                            onClick={() => setStep(activeStep - 1)}
                        />
                    </Stack>
                    <Button
                        label={
                            activeStep === steps.length - 1
                                ? (props.submitLabel ?? 'Save')
                                : (props.nextLabel?.(activeStep) ?? 'Next')
                        }
                        type="submit"
                        variant="primary"
                        disabled={activeStep === steps.length - 1 && props.submitDisabled}
                    />
                </Stack>
            )}
            {submission.error && (
                <Banner status="error" title={submission.error} icon={<Icon icon="error" size="md" />} />
            )}
        </Stack>
    );

    // Use a real form so Enter, reset buttons, and browser constraint validation stay native.
    return (
        <Stack height={props.height} gap={0} hidden={props.hidden} className={props.hidden ? 'hidden!' : undefined}>
            <form
                hidden={props.hidden}
                className={props.height === undefined ? undefined : 'h-full'}
                id={props.id}
                method="post"
                noValidate={steps.length > 0}
                data-form-steps={steps.length > 0 ? '' : undefined}
                aria-busy={submission.submitting || undefined}
                onReset={(event) => {
                    // Reset navigation and feedback, respecting canceled resets and author-owned field validity.
                    const nativeEvent = event.nativeEvent;
                    queueMicrotask(() => {
                        if (nativeEvent.defaultPrevented) return;

                        setSubmission((current) => ({ ...current, error: undefined }));
                        setStep(0);
                        setFailure(null);
                    });
                }}
                onSubmit={(event) => {
                    // Themed fields may reject a submission before this handler runs.
                    if (event.defaultPrevented) return;
                    event.preventDefault();

                    // Intermediate submits advance locally; only the final step sends the complete FormData.
                    if (pending.current) return;

                    const final = steps.length === 0 || activeStep === steps.length - 1;

                    if (final && props.submitDisabled) return;

                    if (steps.length > 0 && !validate(event.currentTarget, final)) return;

                    void submit(event.currentTarget, event.nativeEvent.submitter, final);
                }}
            >
                <fieldset
                    disabled={submission.submitting}
                    className={
                        props.height === undefined ? 'm-0 min-w-0 border-0 p-0' : 'm-0 h-full min-w-0 border-0 p-0'
                    }
                >
                    {steps.length > 0 && props.height !== undefined ? (
                        <Layout
                            height="fill"
                            padding={0}
                            header={
                                <LayoutHeader hasDivider={false}>
                                    <Stack paddingInline={8} paddingBlock={4}>
                                        {progress}
                                    </Stack>
                                </LayoutHeader>
                            }
                            content={
                                <LayoutContent padding={8}>
                                    <Stack
                                        minHeight="100%"
                                        justify="center"
                                        width="100%"
                                        maxWidth={640}
                                        className="mx-auto"
                                    >
                                        {content}
                                    </Stack>
                                </LayoutContent>
                            }
                        />
                    ) : (
                        <Stack gap={4}>
                            {steps.length > 0 && progress}
                            {content}
                        </Stack>
                    )}
                </fieldset>
            </form>
        </Stack>
    );
}

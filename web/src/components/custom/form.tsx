import { ReportedError } from '@/lib/reported';
import type { ViewData } from '@/views/protocol';
import type { FormValidation } from './form-field';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { FormValidationContext, FormRequestContext } from './contexts';
import { use, useEffect, useRef, useState, useTransition, type ComponentProps } from 'react';

const methods = { post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE' } as const;

/** Validates named fields and submits through a Platform callback or the Solution bridge. */
export function Form({
    action,
    method = 'post',
    submitDisabled,
    onSuccess,
    onSubmit,
    onReset,
    noValidate = true,
    children,
    ref,
    ...props
}: Omit<ComponentProps<'form'>, 'action' | 'method'> & {
    /** Solution-relative API path or a Platform callback receiving the complete form data. */
    action: string | ((data: FormData) => void | Promise<void>);
    /** Write method used to submit the form; defaults to post. */
    method?: 'post' | 'put' | 'patch' | 'delete';
    /** Prevents submission when Platform workflow requirements are not satisfied. */
    submitDisabled?: boolean;
    /** Runs after a successful write and automatic cached-data refresh. */
    onSuccess?: (data: ViewData) => void | Promise<void>;
}) {
    const request = use(FormRequestContext);
    const formRef = useRef<HTMLFormElement>(null);
    const rootRef = useMergedRefs(ref, formRef);
    const pending = useRef(false);
    const [isSubmitting, startSubmission] = useTransition();
    const [failure, setFailure] = useState<{ control: HTMLElement } | null>(null);

    // Wait for a Wizard to reveal an invalid panel before moving focus into it.
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

    /** Validates all fields, or one wizard panel together with shared fields. */
    function validate(panel?: HTMLElement) {
        const form = formRef.current;

        if (!form) return false;
        const invalid: HTMLElement[] = [];

        // Validate owned controls, including external fields, without focusing hidden panels.
        for (const control of form.elements) {
            if (
                !(control instanceof HTMLInputElement) &&
                !(control instanceof HTMLSelectElement) &&
                !(control instanceof HTMLTextAreaElement)
            ) {
                continue;
            }

            const owner = control.closest<HTMLElement>('[data-step-panel]');

            if (panel && owner && owner !== panel) continue;

            if (control.willValidate && !control.validity.valid) invalid.push(control);
        }

        // Join themed control failures to the same document-ordered pass.
        const validation: FormValidation = { panel, invalid };
        form.dispatchEvent(new CustomEvent('longlink:validate', { detail: validation, cancelable: true }));
        invalid.sort((left, right) =>
            left === right ? 0 : left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
        );
        const first = invalid[0];

        if (!first) return true;
        first.dispatchEvent(new CustomEvent('longlink:reveal', { bubbles: true }));
        setFailure({ control: first });

        return false;
    }

    /** Serializes before disabling controls and guards against duplicate writes. */
    function submit(form: HTMLFormElement, submitter: HTMLElement | null) {
        pending.current = true;

        startSubmission(async () => {
            // Keep repeated names, binary values, and the submit button's value intact.
            try {
                const data = new FormData(form, submitter);

                // Platform callbacks own their requests; Solution paths use the scoped bridge.
                // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The action contract is a callback or scoped path.
                if (typeof action === 'function') {
                    await action(data);
                } else {
                    if (!request) throw new Error('Forms require the Solution runtime');

                    if (!Object.hasOwn(methods, method)) throw new Error('Forms support post, put, patch, or delete');

                    const result = await request(action, { method: methods[method], form: [...data.entries()] });
                    await onSuccess?.(result);
                }
            } catch (failure) {
                if (!(failure instanceof ReportedError)) throw failure;
            } finally {
                pending.current = false;
            }
        });
    }

    // Keep a real form and persistent controls while descendants own their presentation.
    return (
        <FormValidationContext value={validate}>
            <form
                {...props}
                ref={rootRef}
                method="post"
                noValidate={noValidate}
                data-longlink-form=""
                aria-busy={isSubmitting || props['aria-busy']}
                onReset={(event) => {
                    onReset?.(event);
                    const nativeEvent = event.nativeEvent;

                    // Respect canceled native resets and clear feedback after controls reset.
                    queueMicrotask(() => {
                        if (!nativeEvent.defaultPrevented) {
                            setFailure(null);
                        }
                    });
                }}
                onSubmit={(event) => {
                    onSubmit?.(event);

                    if (event.defaultPrevented) return;
                    event.preventDefault();

                    // Wizard intercepts intermediate submits before the final form validation.
                    if (pending.current || submitDisabled || !validate()) return;
                    submit(event.currentTarget, event.nativeEvent.submitter);
                }}
            >
                <fieldset disabled={isSubmitting} className="m-0 min-w-0 border-0 p-0">
                    {children}
                </fieldset>
            </form>
        </FormValidationContext>
    );
}

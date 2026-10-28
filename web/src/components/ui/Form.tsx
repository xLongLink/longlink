import { ReportedError } from '@/lib/reported';
import type { ViewData } from '@/views/protocol';
import { Stack } from '@astryxdesign/core/Stack';
import { FormValidationContext, type FormValidation } from './FormField';
import { use, createContext, useEffect, useRef, useState, type ReactNode } from 'react';

const methods = { post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE' } as const;

export const FormRequestContext = createContext<
    | ((
          path: string,
          options: { method: (typeof methods)[keyof typeof methods]; form: [string, string | Blob][] }
      ) => Promise<ViewData>)
    | null
>(null);

/** Validates named fields and submits through a Platform callback or the Solution bridge. */
export function Form(props: {
    /** Named controls and layout, including an independent Stepper in wizard mode. */
    children?: ReactNode;
    /** Solution-relative API path or a Platform callback receiving the complete form data. */
    action: string | ((data: FormData) => void | Promise<void>);
    /** Write method used to submit the form; defaults to post. */
    method?: 'post' | 'put' | 'patch' | 'delete';
    /** Native form ID for associating external submit or reset buttons. */
    id?: string;
    /** Bounds the form height. Stepper owns its wizard panel layout. */
    height?: number | string;
    /** Prevents submission when Platform workflow requirements are not satisfied. */
    submitDisabled?: boolean;
    /** Runs after a successful write and automatic cached-data refresh. */
    onSuccess?: (data: ViewData) => void | Promise<void>;
}) {
    const request = use(FormRequestContext);
    const formRef = useRef<HTMLFormElement>(null);
    const pending = useRef(false);
    const [submission, setSubmission] = useState<{ submitting: boolean; error?: unknown }>({ submitting: false });
    const [failure, setFailure] = useState<{ control: HTMLElement } | null>(null);

    // Wait for a Stepper to reveal an invalid panel before moving focus into it.
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

        // Collect native failures without asking the browser to focus hidden panels.
        const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            'input, select, textarea'
        );

        for (const control of controls) {
            const owner = control.closest<HTMLElement>('[data-step-panel]');

            if (panel && owner && owner !== panel) continue;

            if (control.willValidate && !control.validity.valid) invalid.push(control);
        }

        // Join themed control failures to the same document-ordered pass.
        const validation: FormValidation = { scope: form, panel, invalid };
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
    async function submit(form: HTMLFormElement, submitter: HTMLElement | null) {
        pending.current = true;

        // Keep repeated names, binary values, and the submit button's value intact.
        try {
            const data = new FormData(form, submitter);
            setSubmission({ submitting: true });

            // Platform callbacks own their requests; Solution paths use the scoped bridge.
            // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The action contract is a callback or scoped path.
            if (typeof props.action === 'function') {
                await props.action(data);
            } else {
                if (!request) throw new Error('Forms require the Solution runtime');
                const method = props.method ?? 'post';

                if (!Object.hasOwn(methods, method)) throw new Error('Forms support post, put, patch, or delete');

                const result = await request(props.action, { method: methods[method], form: [...data.entries()] });
                await props.onSuccess?.(result);
            }
        } catch (failure) {
            if (!(failure instanceof ReportedError)) setSubmission({ submitting: false, error: failure });
        } finally {
            pending.current = false;
            setSubmission((current) => ({ ...current, submitting: false }));
        }
    }

    // Forward asynchronous failures to the existing render error boundary.
    if ('error' in submission) throw submission.error;

    // Keep a real form and persistent controls while descendants own their presentation.
    return (
        <FormValidationContext value={validate}>
            <form
                ref={formRef}
                id={props.id}
                method="post"
                noValidate
                data-longlink-form=""
                aria-busy={submission.submitting || undefined}
                onReset={(event) => {
                    const nativeEvent = event.nativeEvent;

                    // Respect canceled native resets and clear feedback after controls reset.
                    queueMicrotask(() => {
                        if (!nativeEvent.defaultPrevented) {
                            setFailure(null);
                        }
                    });
                }}
                onSubmit={(event) => {
                    if (event.defaultPrevented) return;
                    event.preventDefault();

                    // Stepper intercepts intermediate submits before the final form validation.
                    if (pending.current || props.submitDisabled || !validate()) return;
                    void submit(event.currentTarget, event.nativeEvent.submitter);
                }}
            >
                <fieldset disabled={submission.submitting} className="m-0 min-w-0 border-0 p-0">
                    <Stack gap={3} height={props.height}>
                        {props.children}
                    </Stack>
                </fieldset>
            </form>
        </FormValidationContext>
    );
}

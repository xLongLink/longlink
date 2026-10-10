import { Icon } from './Icon';
import { Stack } from './Stack';
import type { ReactNode } from 'react';
import type { ViewData } from '@/views/protocol';
import { Banner } from '@astryxdesign/core/Banner';
import { createContext, use, useRef, useState } from 'react';

export const FormRequestContext = createContext<
    | ((
          path: string,
          options: {
              method: 'POST';
              form: [string, string | Blob][];
          }
      ) => Promise<ViewData>)
    | null
>(null);

/** Submits named native fields through the Solution bridge without navigating or resetting the form. */
export function Form(props: {
    /** Hides the form while keeping its fields mounted and enabled for submission and validation. */
    hidden?: boolean;
    /** Named controls, ordinary HTML fields, and layout components. */
    children?: ReactNode;
    /** Solution-relative API path; external URLs are not supported. */
    action: string;
    /** Only POST is supported; defaults to post. Use request() for other methods. */
    method?: 'post';
    /** Native form ID for associating external submit or reset buttons. */
    id?: string;
    /** Runs after a successful write and automatic cached-data refresh. */
    onSuccess?: (data: ViewData) => void | Promise<void>;
}) {
    // Obtain the request capability from the isolated runtime, never from global state.
    const request = use(FormRequestContext);
    const pending = useRef(false);
    const [submission, setSubmission] = useState<{ submitting: boolean; error?: string }>({ submitting: false });

    /** Runs the asynchronous request after the native submit event has been intercepted. */
    async function submit(form: HTMLFormElement, submitter: HTMLElement | null) {
        // Guard synchronously so repeated submits cannot race a React state update.
        if (pending.current) return;
        pending.current = true;

        // Serialize before disabling fields, preserving repeated names, files, and the submitter.
        try {
            const data = new FormData(form, submitter);
            setSubmission({ submitting: true });

            // Route all writes through the same validated transport as explicit request calls.
            if (!request) throw new Error('Forms require the Solution runtime');

            if (props.method !== undefined && props.method !== 'post') {
                throw new Error('Forms support method="post"');
            }

            const result = await request(props.action, { method: 'POST', form: [...data.entries()] });
            await props.onSuccess?.(result);
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

    // Use a real form so Enter, reset buttons, and browser constraint validation stay native.
    return (
        <form
            hidden={props.hidden}
            className={props.hidden ? 'hidden!' : undefined}
            id={props.id}
            method="post"
            aria-busy={submission.submitting || undefined}
            onReset={(event) => {
                // Clear only submission feedback, respecting canceled resets and author-owned field validity.
                const nativeEvent = event.nativeEvent;
                queueMicrotask(() => {
                    if (nativeEvent.defaultPrevented) return;

                    setSubmission((current) => ({ ...current, error: undefined }));
                });
            }}
            onSubmit={(event) => {
                // Themed fields may reject a submission before this handler runs.
                if (event.defaultPrevented) return;
                event.preventDefault();
                void submit(event.currentTarget, event.nativeEvent.submitter);
            }}
        >
            <Stack gap={3}>
                <fieldset disabled={submission.submitting} className="m-0 min-w-0 border-0 p-0">
                    {props.children}
                </fieldset>
                {submission.error && (
                    <Banner status="error" title={submission.error} icon={<Icon icon="error" size="md" />} />
                )}
            </Stack>
        </form>
    );
}

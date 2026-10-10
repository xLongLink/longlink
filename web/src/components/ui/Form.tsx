import * as forms from '@/components/Form';
import type { ViewData } from '@/views/protocol';
import { use, createContext, type ReactNode } from 'react';

export const FormRequestContext = createContext<
    ((path: string, options: { method: 'POST'; form: [string, string | Blob][] }) => Promise<ViewData>) | null
>(null);

/** Submits named native fields through the Solution bridge without navigating or resetting the form. */
export function Form(props: {
    /** Hides the form while keeping its fields mounted and enabled for submission and validation. */
    hidden?: boolean;
    /** Named controls and layout, or direct FormStep children for automatic navigation. Next validates the current step and shared fields; final submission validates all steps and reveals the first invalid field. Inactive fields remain mounted and enabled. */
    children?: ReactNode;
    /** Solution-relative API path; external URLs are not supported. */
    action: string;
    /** Only POST is supported; defaults to post. Use request() for other methods. */
    method?: 'post';
    /** Native form ID for associating external submit or reset buttons. */
    id?: string;
    /** Label for the automatic final submit button when using FormStep children; defaults to Save. */
    submitLabel?: string;
    /** Runs after a successful write and automatic cached-data refresh. */
    onSuccess?: (data: ViewData) => void | Promise<void>;
}) {
    // Keep Solution transport separate from the shared native form lifecycle.
    const request = use(FormRequestContext);

    return (
        <forms.Form
            hidden={props.hidden}
            id={props.id}
            submitLabel={props.submitLabel}
            action={async (data) => {
                // Route writes through the same validated bridge as explicit request calls.
                if (!request) throw new Error('Forms require the Solution runtime');

                if (props.method !== undefined && props.method !== 'post')
                    throw new Error('Forms support method="post"');

                const result = await request(props.action, { method: 'POST', form: [...data.entries()] });
                await props.onSuccess?.(result);
            }}
        >
            {props.children}
        </forms.Form>
    );
}

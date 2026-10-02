import { z } from 'zod';
import * as React from 'react';
import { transform } from 'sucrase';
import { stoneTheme } from '@/theme';
import * as components from './components';
import { createRoot } from 'react-dom/client';
import * as links from '@astryxdesign/core/Link';
import { Theme } from '@astryxdesign/core/theme';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { FormProvider, useController, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import {
    requestSchema,
    parametersSchema,
    messageSize,
    MAX_MESSAGE_SIZE,
    MAX_PENDING_REQUESTS,
    MAX_VIEW_HEIGHT,
    REQUEST_TIMEOUT,
    type RequestCommand,
    type ViewReply,
} from './protocol';
import './theme.css';

declare global {
    interface Window {
        __VIEW_SESSION__: string;
    }
}

const session = window.__VIEW_SESSION__;
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
>();
let sequence = 0;
let port: MessagePort;

/** Requests a scoped Solution operation and refreshes cached data after successful writes. */
async function request(
    path: string,
    options: Omit<RequestCommand, 'type' | 'id' | 'path' | 'method'> & { method?: RequestCommand['method'] } = {}
): Promise<unknown> {
    const id = sequence++;
    const command = requestSchema.parse({ ...options, type: 'request', id, path, method: options.method ?? 'GET' });
    if (messageSize(command) > MAX_MESSAGE_SIZE) throw new Error('Solution request is too large');
    if (pending.size >= MAX_PENDING_REQUESTS) throw new Error('Too many pending requests');
    const data = await new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error('Solution request timed out'));
        }, REQUEST_TIMEOUT);
        pending.set(id, { resolve, reject, timer });

        // A failed transfer must release its slot and timer immediately, not at timeout.
        try {
            port.postMessage(command);
        } catch (error) {
            pending.delete(id);
            clearTimeout(timer);
            reject(error);
        }
    });

    // Refresh active data and mark inactive resources stale only after the write succeeds.
    if (command.method !== 'GET') await client.invalidateQueries();

    return data;
}

/** Requests navigation inside the host's Solution route prefix. */
function navigate(path: string): void {
    port.postMessage({ type: 'navigate', path });
}

/** Reads Solution data through the bridge; the shared boundaries own initial loading and failures. */
function useApi(path: string): unknown {
    // Use the full request path as cache identity, including pagination parameters.
    const { data } = useSuspenseQuery({
        queryKey: ['api', path],
        queryFn: () => request(path),
    });
    return data;
}

type FormValues = Record<string, string | number | boolean | null>;
type FieldProps = { name: string; label: string; required?: boolean };

/** Submits named fields as JSON through the scoped bridge without a custom request handler. */
function ApiForm({
    action,
    method = 'POST',
    submitLabel = 'Save',
    children,
}: {
    action: string;
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    submitLabel?: string;
    children: React.ReactNode;
}) {
    const form = useForm<FormValues>({ shouldUnregister: true });
    const submitting = React.useRef(false);

    // Keep submission, validation, feedback, and duplicate-write protection owned by the form.
    return (
        <FormProvider {...form}>
            <components.Stack
                as="form"
                gap={4}
                onSubmit={(event) => {
                    event.preventDefault();
                    if (submitting.current) return;
                    submitting.current = true;
                    form.clearErrors('root');
                    void form
                        .handleSubmit(async (values) => {
                            try {
                                await request(action, { method, json: values });
                            } catch (error) {
                                form.setError('root', {
                                    message: error instanceof Error ? error.message : 'Form could not be saved',
                                });
                            }
                        })(event)
                        .finally(() => {
                            submitting.current = false;
                        });
                }}
            >
                {children}
                {form.formState.errors.root && (
                    <components.Banner status="error" title={form.formState.errors.root.message} />
                )}
                {form.formState.isSubmitSuccessful && !form.formState.errors.root && (
                    <components.Banner status="success" title="Saved successfully" />
                )}
                <components.Button
                    type="submit"
                    label={submitLabel}
                    variant="primary"
                    isLoading={form.formState.isSubmitting}
                />
            </components.Stack>
        </FormProvider>
    );
}

/** Registers a text field and validates required values and email addresses. */
function TextField({
    name,
    label,
    required = false,
    type = 'text',
    placeholder,
    defaultValue = '',
}: FieldProps & { type?: 'text' | 'email' | 'password'; placeholder?: string; defaultValue?: string }) {
    const {
        field: { ref, value, onChange, onBlur },
        fieldState,
        formState,
    } = useController<FormValues>({
        name,
        defaultValue,
        rules: {
            required: required ? `${label} is required` : false,
            validate:
                type === 'email'
                    ? (value) => !value || z.email().safeParse(value).success || 'Enter a valid email address'
                    : undefined,
        },
    });

    // Use the shared input's accessibility and validation presentation.
    return (
        <components.TextInput
            ref={ref}
            htmlName={name}
            label={label}
            type={type}
            placeholder={placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
            onBlur={onBlur}
            isRequired={required}
            isReadOnly={formState.isSubmitting}
            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
        />
    );
}

/** Registers a numeric JSON field, accepting JSX string or numeric bounds. */
function NumberField({
    name,
    label,
    required = false,
    min,
    max,
    step,
    defaultValue = null,
}: FieldProps & {
    min?: string | number;
    max?: string | number;
    step?: string | number;
    defaultValue?: number | null;
}) {
    // Normalize bounds at the component boundary before passing them to validation and the input.
    const minimum = min === undefined ? undefined : z.coerce.number().finite().parse(min);
    const maximum = max === undefined ? undefined : z.coerce.number().finite().parse(max);
    const increment = step === undefined ? undefined : z.coerce.number().positive().parse(step);
    const {
        field: { ref, value, onChange, onBlur },
        fieldState,
        formState,
    } = useController<FormValues>({
        name,
        defaultValue,
        rules: {
            required: required ? `${label} is required` : false,
            min:
                minimum === undefined ? undefined : { value: minimum, message: `${label} must be at least ${minimum}` },
            max: maximum === undefined ? undefined : { value: maximum, message: `${label} must be at most ${maximum}` },
        },
    });

    // Keep empty numbers null and populated numbers numeric in the submitted JSON.
    return (
        <components.NumberInput
            ref={ref}
            htmlName={name}
            label={label}
            value={typeof value === 'number' ? value : null}
            onChange={onChange}
            onBlur={onBlur}
            min={minimum}
            max={maximum}
            step={increment}
            hasClear
            isRequired={required}
            isReadOnly={formState.isSubmitting}
            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
        />
    );
}

/** Registers a boolean field, including false when unchecked. */
function CheckboxField({
    name,
    label,
    required = false,
    defaultValue = false,
}: FieldProps & { defaultValue?: boolean }) {
    const {
        field: { ref, value, onChange, onBlur },
        fieldState,
        formState,
    } = useController<FormValues>({
        name,
        defaultValue,
        rules: { required: required ? `${label} is required` : false },
    });

    // Preserve boolean values instead of native checkbox submission strings.
    return (
        <components.CheckboxInput
            ref={ref}
            htmlName={name}
            label={label}
            value={value === true}
            onChange={onChange}
            onBlur={onBlur}
            isRequired={required}
            isReadOnly={formState.isSubmitting}
            status={
                fieldState.error
                    ? { type: 'error', message: fieldState.error.message ?? `${label} is required` }
                    : undefined
            }
        />
    );
}

/** Limits navigation to a host capability rather than granting top-level browser access. */
function Link({ to, children }: { to: string; children: React.ReactNode }) {
    return (
        <links.Link
            href={to}
            onClick={(event) => {
                // Keep navigation inside the host bridge instead of loading a page in the sandbox.
                event.preventDefault();
                navigate(to);
            }}
        >
            {children}
        </links.Link>
    );
}

/** Formats numeric currency values using the browser's standard internationalization support. */
function Currency({ value, currency, locale }: { value: number; currency: string; locale?: string }) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/** Presents Solution lifecycle states inside the isolated runtime. */
function StatusBadge({ status }: { status: 'running' | 'creating' | 'failed' }) {
    return status === 'running' ? null : (
        <components.Badge
            label={status === 'creating' ? 'Creating' : 'Failed'}
            variant={status === 'creating' ? 'info' : 'error'}
        />
    );
}

/** Loads image attachments through the scoped bridge only after a user requests their preview. */
function FileViewer({ src, title }: { src: string; title: string }) {
    const [open, setOpen] = React.useState(false);

    // Each opened attachment owns a fresh preview and its blob URL.
    return (
        <components.Stack gap={2}>
            <components.Button variant="ghost" label={title} clickAction={() => setOpen(!open)} />
            {open && <FilePreview key={src} src={src} title={title} />}
        </components.Stack>
    );
}

/** Owns one attachment attempt and releases its blob URL when the preview closes or changes. */
function FilePreview({ src, title }: { src: string; title: string }) {
    const [preview, setPreview] = React.useState<
        { status: 'loading' } | { status: 'error' } | { status: 'ready'; url: string }
    >({ status: 'loading' });

    // Own every blob URL and reject unsupported media rather than loading a privileged document frame.
    React.useEffect(() => {
        let active = true;
        let objectUrl: string | undefined;
        void request(src, { binary: true })
            .then((value) => {
                if (!active) return;
                if (!(value instanceof Blob) || !value.type.startsWith('image/')) {
                    setPreview({ status: 'error' });
                    return;
                }
                objectUrl = URL.createObjectURL(value);
                setPreview({ status: 'ready', url: objectUrl });
            })
            .catch(() => {
                if (active) setPreview({ status: 'error' });
            });
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    // Render only states belonging to the current mounted preview.
    return preview.status === 'error' ? (
        <components.Text>Preview unavailable for this file type.</components.Text>
    ) : preview.status === 'ready' ? (
        <img src={preview.url} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
    ) : (
        <components.Spinner label="Loading attachment" />
    );
}

/** Contains render failures without exposing host data or internals. */
class ViewBoundary extends React.Component<{ children: React.ReactNode; onReset: () => void }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        return this.state.failed ? (
            <components.Banner
                status="error"
                title="View could not be loaded"
                endContent={
                    <components.Button
                        label="Retry"
                        clickAction={() => {
                            // Allow failed queries to fetch again before remounting the View.
                            this.props.onReset();
                            this.setState({ failed: false });
                        }}
                    />
                }
            />
        ) : (
            this.props.children
        );
    }
}

const initialization = z.object({ session: z.string(), source: z.string(), params: parametersSchema }).strict();

/** Receives source once from the parent, then accepts capabilities only over the transferred port. */
function initialize(event: MessageEvent<unknown>): void {
    if (event.source !== window.parent || event.ports.length !== 1) return;
    const parsed = initialization.safeParse(event.data);
    if (!parsed.success || parsed.data.session !== session) return;
    window.removeEventListener('message', initialize);
    port = event.ports[0];
    port.onmessage = (reply: MessageEvent<ViewReply>) => {
        const waiter = pending.get(reply.data.id);
        if (!waiter) return;
        pending.delete(reply.data.id);
        clearTimeout(waiter.timer);
        if (reply.data.ok) waiter.resolve(reply.data.data);
        else waiter.reject(new Error(reply.data.error));
    };
    const mount = document.getElementById('view');
    if (!mount) {
        port.close();
        return;
    }
    const root = createRoot(mount);

    // Measure the content root, not the viewport, so shorter Views can shrink again.
    let height = 0;
    const observer = new ResizeObserver(() => {
        const nextHeight = Math.min(MAX_VIEW_HEIGHT, Math.max(1, Math.ceil(mount.getBoundingClientRect().height)));
        if (nextHeight === height) return;
        height = nextHeight;
        port.postMessage({ type: 'resize', height });
    });
    observer.observe(mount);

    // Release all resources acquired by this initialized sandbox in one teardown.
    window.addEventListener(
        'pagehide',
        () => {
            observer.disconnect();
            for (const waiter of pending.values()) {
                clearTimeout(waiter.timer);
                waiter.reject(new Error('View closed'));
            }
            pending.clear();
            port.close();
        },
        { once: true }
    );

    // Compilation and evaluation happen only in the sandbox, never in the Platform module graph.
    try {
        const code = transform(parsed.data.source, {
            transforms: ['jsx', 'imports'],
            jsxRuntime: 'classic',
            jsxPragma: 'createElement',
            jsxFragmentPragma: 'Fragment',
            production: true,
        }).code;
        const bindings = {
            createElement: React.createElement,
            Fragment: React.Fragment,
            useState: React.useState,
            useEffect: React.useEffect,
            useMemo: React.useMemo,
            useRef: React.useRef,
            ...components,
            Link,
            Currency,
            FileViewer,
            StatusBadge,
            ApiForm,
            TextField,
            NumberField,
            CheckboxField,
            request,
            navigate,
            useApi,
        };
        const module = { exports: {} as { default?: React.ComponentType } };
        // oxlint-disable-next-line typescript/no-implied-eval -- This entry runs exclusively in the opaque-origin sandbox.
        const evaluate = new Function(
            'module',
            'exports',
            ...Object.keys(bindings),
            `${code}\nreturn module.exports.default;`
        );
        const result: unknown = evaluate(module, module.exports, ...Object.values(bindings));
        if (typeof result !== 'function') throw new Error('A View must export a component as default');
        const View = result as React.ComponentType<{ params: Readonly<Record<string, string>> }>;
        root.render(
            <Theme theme={stoneTheme} mode="dark">
                <LayerProvider toast={{ position: 'bottomEnd' }}>
                    <QueryClientProvider client={client}>
                        <QueryErrorResetBoundary>
                            {({ reset }) => (
                                <ViewBoundary onReset={reset}>
                                    <React.Suspense fallback={<components.Spinner label="Loading View" />}>
                                        <View params={Object.freeze(parsed.data.params)} />
                                    </React.Suspense>
                                </ViewBoundary>
                            )}
                        </QueryErrorResetBoundary>
                    </QueryClientProvider>
                </LayerProvider>
            </Theme>
        );
    } catch {
        root.render(<p>View compilation failed. Export a default JSX component without package imports.</p>);
    }
}

// A fresh opaque-origin frame cannot read parent state, storage, or cookies.
window.addEventListener('message', initialize);
window.parent.postMessage(session, '*');

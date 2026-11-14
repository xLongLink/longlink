import { useValue } from './value';
import { FormField } from './form-field';
import type { FieldProps } from './types';
import { Button } from '@/components/shadcn/button';
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { InputGroup, InputGroupButton } from '@/components/shadcn/input-group';
import { CircleAlert, CircleCheck, TriangleAlert, Upload, X } from 'lucide-react';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/shadcn/field';

type FileInputProps = FieldProps & {
    value?: File | File[] | null;
    onChange?: (value: File | File[] | null) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    maxFiles?: number;
    placeholder?: string;
    mode?: 'input' | 'dropzone';
};

/** Selects files with explicit upload constraints; uploading remains a Solution operation. */
export function FileInput(props: FileInputProps) {
    return (
        <NativeFileInput
            label={props.label}
            description={props.description}
            name={props.name}
            required={props.required}
            disabled={props.disabled}
            value={props.value}
            onChange={props.onChange}
            accept={props.accept}
            multiple={props.multiple}
            maxSize={props.maxSize}
            maxFiles={props.maxFiles}
            placeholder={props.placeholder}
            mode={props.mode}
        />
    );
}

/** Adds trusted Platform validation status without exposing it to Solution Views. */
export function NativeFileInput({
    label,
    description,
    name,
    required,
    disabled,
    value,
    onChange,
    accept,
    multiple = false,
    maxSize,
    maxFiles,
    placeholder = multiple ? 'Choose files' : 'Choose file',
    mode = 'input',
    status
}: FileInputProps & { status?: { type: 'error' | 'warning' | 'success'; message?: string } }) {
    // Keep the browser's transient FileList separate from the caller-owned selection.
    const field = useValue(value, null, onChange);
    const input = useRef<HTMLInputElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const id = useId();
    const [error, setError] = useState<string>();
    const [dragging, setDragging] = useState(false);
    const files = field.value === null ? [] : Array.isArray(field.value) ? field.value : [field.value];
    const fileNames = files.map((file) => file.name).join(', ');
    const message = status?.message ?? error;
    const invalid = status ? status.type === 'error' : !!error;
    const statusType = status?.type ?? (error ? 'error' : undefined);
    const StatusIcon = statusType === 'success' ? CircleCheck : statusType === 'warning' ? TriangleAlert : CircleAlert;

    const describedBy =
        [description && `${id}-description`, message && `${id}-status`, required && `${id}-required`]
            .filter(Boolean)
            .join(' ') || undefined;

    // Canceled resets preserve both the selection and its validation feedback.
    useEffect(() => {
        const form = field.ref.current?.closest('form');

        if (!form) return;

        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (event.defaultPrevented) return;
                setError(undefined);
                setDragging(false);
            });
        };

        form.addEventListener('reset', reset);

        return () => form.removeEventListener('reset', reset);
    }, [field.ref]);

    // Filter before publishing, matching the released partial-selection and count-limit behavior.
    const select = (selected: File[]) => {
        if (disabled || input.current?.matches(':disabled')) return;

        const errors: string[] = [];
        const types = accept ? accept.split(',').map((type) => type.trim().toLowerCase()) : undefined;

        let valid = selected.filter((file) => {
            if (
                types &&
                !types.some((type) =>
                    type.startsWith('.')
                        ? file.name.toLowerCase().endsWith(type)
                        : type.endsWith('/*')
                          ? file.type.toLowerCase().startsWith(type.slice(0, -1))
                          : file.type.toLowerCase() === type
                )
            ) {
                errors.push(`"${file.name}" is not an accepted file type`);

                return false;
            }

            if (maxSize != null && file.size > maxSize) {
                const limit =
                    maxSize < 1024
                        ? `${maxSize} B`
                        : maxSize < 1024 * 1024
                          ? `${(maxSize / 1024).toFixed(1)} KB`
                          : `${(maxSize / (1024 * 1024)).toFixed(1)} MB`;

                errors.push(`"${file.name}" exceeds ${limit} limit`);

                return false;
            }

            return true;
        });

        if (multiple && maxFiles != null && valid.length > maxFiles) {
            errors.push(`Maximum ${maxFiles} files allowed`);
            valid = valid.slice(0, maxFiles);
        }

        setError(errors.length ? errors.join(' ') : undefined);
        field.onChange(valid.length ? (multiple ? valid : valid[0]) : null);
    };

    // Both click and keyboard activation use the same guarded native picker.
    const open = () => {
        if (!disabled && !input.current?.matches(':disabled')) input.current?.click();
    };

    const dragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (disabled || input.current?.matches(':disabled')) {
            event.dataTransfer.dropEffect = 'none';

            return;
        }

        setDragging(true);
    };

    return (
        <FormField
            label={label}
            name={name}
            required={required}
            disabled={disabled}
            fieldRef={field.ref}
            values={files}
            serialize
        >
            <Field
                className="view-text-field view-file-field group/file"
                data-disabled={disabled || undefined}
                data-mode={mode}
                data-status={statusType}
            >
                <FieldContent>
                    <FieldLabel htmlFor={id} id={`${id}-label`}>
                        {label}
                        {required && <span className="text-muted-foreground">Required</span>}
                    </FieldLabel>
                    {description && (
                        <FieldDescription
                            id={`${id}-description`}
                            onClick={(event) => {
                                if (event.target === event.currentTarget) trigger.current?.click();
                            }}
                        >
                            <label htmlFor={id}>{description}</label>
                        </FieldDescription>
                    )}
                </FieldContent>
                <InputGroup
                    className="view-file-input data-[mode=dropzone]:h-auto data-[mode=dropzone]:flex-col data-[mode=dropzone]:gap-2 data-[mode=dropzone]:border-dashed data-[mode=dropzone]:px-4 data-[mode=dropzone]:py-6 data-dragging:border-ring data-dragging:bg-muted group-data-disabled/file:opacity-50"
                    data-mode={mode}
                    data-dragging={(!disabled && dragging) || undefined}
                    data-status={statusType}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) open();
                    }}
                    onDragEnter={mode === 'dropzone' ? dragOver : undefined}
                    onDragOver={mode === 'dropzone' ? dragOver : undefined}
                    onDragLeave={
                        mode === 'dropzone'
                            ? (event) => {
                                  if (
                                      event.relatedTarget instanceof Node &&
                                      event.currentTarget.contains(event.relatedTarget)
                                  )
                                      return;
                                  setDragging(false);
                              }
                            : undefined
                    }
                    onDrop={
                        mode === 'dropzone'
                            ? (event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setDragging(false);

                                  if (event.dataTransfer.files.length) select(Array.from(event.dataTransfer.files));
                              }
                            : undefined
                    }
                >
                    <Button
                        ref={trigger}
                        id={id}
                        className="view-file-trigger min-w-0 flex-1 justify-start aria-disabled:cursor-default"
                        variant="ghost"
                        type="button"
                        aria-label={fileNames ? `${label}, ${fileNames}` : label}
                        aria-disabled={disabled || undefined}
                        aria-invalid={invalid || undefined}
                        aria-describedby={describedBy}
                        onClick={open}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            open();
                        }}
                    >
                        {(mode === 'input' || !files.length) && <Upload aria-hidden="true" />}
                        <span
                            className="min-w-0 truncate data-placeholder:text-muted-foreground"
                            data-placeholder={!files.length || undefined}
                        >
                            {fileNames || (dragging && !disabled ? 'Drop files here' : placeholder)}
                        </span>
                    </Button>
                    {statusType && mode === 'input' && (
                        <StatusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <input
                        ref={input}
                        type="file"
                        className="sr-only [clip-path:inset(50%)]"
                        accept={accept}
                        multiple={multiple}
                        disabled={disabled}
                        aria-hidden="true"
                        tabIndex={-1}
                        onChange={(event) => {
                            select(Array.from(event.currentTarget.files ?? []));
                            event.currentTarget.value = '';
                        }}
                    />
                    {!!files.length && !disabled && (
                        <InputGroupButton
                            type="button"
                            size="icon-xs"
                            aria-label={`Clear ${label}`}
                            onClick={() => {
                                setError(undefined);
                                field.onChange(null);
                                trigger.current?.focus({ preventScroll: true });
                            }}
                        >
                            <X aria-hidden="true" />
                        </InputGroupButton>
                    )}
                </InputGroup>
                {required && (
                    <span id={`${id}-required`} className="sr-only [clip-path:inset(50%)]">
                        Required
                    </span>
                )}
                {message &&
                    (invalid ? (
                        <FieldError id={`${id}-status`} className="view-file-status">
                            {message}
                        </FieldError>
                    ) : (
                        <FieldDescription id={`${id}-status`} className="view-file-status" role="status">
                            {message}
                        </FieldDescription>
                    ))}
                <span className="sr-only [clip-path:inset(50%)]" role="status">
                    {!message && fileNames ? `Selected: ${fileNames}` : ''}
                </span>
            </Field>
        </FormField>
    );
}

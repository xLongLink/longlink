import { useValue } from './value';
import { flushSync } from 'react-dom';
import { FormField } from './form-field';
import type { FieldProps } from './types';
import { Button } from '@/components/shadcn/button';
import { CalendarDays, Clock, X } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from 'react';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/shadcn/field';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/shadcn/popover';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';

/** Owns editable temporal drafts while only the accepted ISO value owns submission. */
export function TemporalField<T extends string>(
    props: FieldProps & {
        value?: T;
        defaultValue?: T;
        controlled: boolean;
        onChange?: (value: T | undefined) => void;
        kind: 'date' | 'time';
        placeholder: string;
        parse: (text: string) => T | null;
        isComplete?: (text: string) => boolean;
        format: (value: T) => string;
        accepts: (value: T) => boolean;
        step?: (value: T | undefined, direction: number) => T | null;
        picker: (value: T | undefined, select: (value: T, close?: boolean) => void) => ReactNode;
    }
) {
    const field = useValue<T | undefined>(props.value, props.defaultValue, props.onChange, props.controlled);
    const input = useRef<HTMLInputElement>(null);
    const id = useId();
    const [open, setOpen] = useState(false);
    const [coarse, setCoarse] = useState(false);
    const restoreFocus = useRef(true);
    const [draft, setDraft] = useState<{ source: T | undefined; text: string } | null>(null);

    // Time columns replace the software keyboard on coarse pointers.
    useEffect(() => {
        if (props.kind !== 'time') return;
        const media = window.matchMedia('(pointer: coarse)');
        const change = () => setCoarse(media.matches);

        change();
        media.addEventListener('change', change);

        return () => media.removeEventListener('change', change);
    }, [props.kind]);

    // Portalled controls cannot inherit a fieldset disabled after the picker opened.
    const blocked = () =>
        Boolean(props.disabled || input.current?.matches(':disabled') || input.current?.closest('fieldset:disabled'));

    // External replacements and disabling abandon edits, not caller-owned values.
    if (draft && props.disabled) setDraft(null);
    else if (draft && draft.source !== field.value) {
        setDraft(field.value === props.parse(draft.text) ? { ...draft, source: field.value } : null);
    }

    if (open && props.disabled) setOpen(false);
    const validValue = field.value !== undefined && props.accepts(field.value);
    const text = draft?.text ?? (field.value ? (validValue ? props.format(field.value) : field.value) : '');
    const parsed = draft ? props.parse(text) : (field.value ?? null);
    const invalid = text.trim() !== '' && (parsed === null || !props.accepts(parsed));

    const error = invalid
        ? `Enter a valid ${props.kind} within the allowed range.`
        : props.required && !text.trim()
          ? 'Please complete this field.'
          : undefined;

    /** Commits only valid edits and immediately returns display ownership to controlled callers. */
    function commit() {
        if (!draft || blocked() || invalid) return;
        setDraft(null);
        const next = text.trim() ? (parsed ?? undefined) : undefined;

        if (next !== field.value) field.onChange(next);
    }

    const submit = useEffectEvent(() => flushSync(commit));

    // Enter, submit-button, and programmatic submits share the same accepted draft.
    useEffect(() => {
        const form = field.ref.current?.closest('form');

        if (!form) return;

        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (!event.defaultPrevented) {
                    setDraft(null);
                    setOpen(false);
                }
            });
        };

        form.addEventListener('submit', submit, true);
        form.addEventListener('reset', reset);

        return () => {
            form.removeEventListener('submit', submit, true);
            form.removeEventListener('reset', reset);
        };
    }, [field.ref]);

    /** Picker selections cannot bypass constraints or controlled ownership. */
    function select(value: T, close = true) {
        if (blocked() || !props.accepts(value)) return;
        setDraft(null);

        if (value !== field.value) field.onChange(value);

        if (close) setOpen(false);
    }

    // Draft validation is separate from the sole canonical submission carrier.
    return (
        <FormField
            {...props}
            required={false}
            fieldRef={field.ref}
            values={[field.value && validValue ? field.value : '']}
            serialize
            error={error}
        >
            <Field className="view-text-field" data-disabled={props.disabled || undefined}>
                <FieldContent>
                    <FieldLabel htmlFor={id} id={`${id}-label`}>
                        {props.label}
                        {props.required && <span className="text-muted-foreground">Required</span>}
                    </FieldLabel>
                    {props.description && (
                        <FieldDescription
                            id={`${id}-description`}
                            onClick={(event) => {
                                if (event.target === event.currentTarget) input.current?.focus();
                            }}
                        >
                            <label htmlFor={id}>{props.description}</label>
                        </FieldDescription>
                    )}
                </FieldContent>
                <Popover
                    open={open}
                    onOpenChange={(next, details) => {
                        if (next && blocked()) return;
                        restoreFocus.current = details.reason !== 'outside-press' && details.reason !== 'focus-out';
                        setOpen(next);
                    }}
                    modal={props.kind === 'date' ? false : coarse ? true : 'trap-focus'}
                >
                    <InputGroup className="data-disabled:opacity-50" data-disabled={props.disabled || undefined}>
                        <InputGroupInput
                            ref={input}
                            id={id}
                            value={text}
                            autoComplete="off"
                            aria-labelledby={`${id}-label`}
                            aria-describedby={props.description ? `${id}-description` : undefined}
                            aria-disabled={props.disabled || undefined}
                            readOnly={props.disabled || coarse || undefined}
                            aria-required={props.required || undefined}
                            aria-invalid={invalid || undefined}
                            placeholder={props.placeholder}
                            onClick={() => {
                                if (coarse && !blocked()) {
                                    restoreFocus.current = true;
                                    setOpen(true);
                                }
                            }}
                            onChange={(event) => {
                                if (blocked() || coarse) return;
                                const text = event.target.value;
                                const next = props.parse(text);

                                const composing =
                                    event.nativeEvent instanceof InputEvent && event.nativeEvent.isComposing;

                                const complete = !composing && (props.isComplete?.(text) ?? true);
                                const accepted = complete && next !== null && props.accepts(next);

                                // Complete edits notify immediately; incomplete text remains an editable draft.
                                if (accepted && next !== field.value) field.onChange(next);
                                setDraft({ source: accepted && !props.controlled ? next : field.value, text });
                            }}
                            onBlur={commit}
                            onKeyDown={(event) => {
                                if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;

                                if (blocked()) {
                                    if (event.key === 'Enter') event.preventDefault();

                                    return;
                                }

                                if (coarse && (event.key === 'Enter' || event.key === ' ')) {
                                    event.preventDefault();
                                    restoreFocus.current = true;
                                    setOpen(true);

                                    return;
                                }

                                if (event.key === 'Escape') setDraft(null);

                                if (event.key === 'Enter') {
                                    if (invalid) event.preventDefault();
                                    else flushSync(commit);
                                }

                                if (event.key === 'ArrowDown' && (props.kind === 'date' || event.altKey)) {
                                    event.preventDefault();
                                    restoreFocus.current = true;
                                    setOpen(true);
                                } else if (props.step && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                                    event.preventDefault();
                                    const next = props.step(field.value, event.key === 'ArrowUp' ? 1 : -1);

                                    if (next && props.accepts(next)) {
                                        setDraft(null);
                                        field.onChange(next);
                                    }
                                }
                            }}
                        />
                        <InputGroupAddon align="inline-end">
                            {(text || field.value) && !props.disabled && (
                                <InputGroupButton
                                    type="button"
                                    size="icon-xs"
                                    aria-label={`Clear ${props.label}`}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                        if (blocked()) return;
                                        setDraft(null);
                                        field.onChange(undefined);
                                        input.current?.focus({ preventScroll: true });
                                    }}
                                >
                                    <X aria-hidden="true" />
                                </InputGroupButton>
                            )}
                            <PopoverTrigger
                                type="button"
                                render={<InputGroupButton size="icon-xs" />}
                                aria-label={`Choose ${props.label}`}
                                aria-disabled={props.disabled || undefined}
                                onClick={(event) => {
                                    if (blocked()) event.preventDefault();
                                }}
                            >
                                {props.kind === 'date' ? (
                                    <CalendarDays aria-hidden="true" />
                                ) : (
                                    <Clock aria-hidden="true" />
                                )}
                            </PopoverTrigger>
                        </InputGroupAddon>
                    </InputGroup>
                    <PopoverContent
                        align="start"
                        className={
                            props.kind === 'date'
                                ? 'w-auto p-0'
                                : 'w-fit max-w-[calc(100vw-1rem)] max-h-[var(--available-height)] overflow-auto'
                        }
                        initialFocus={props.kind === 'date' ? false : true}
                        finalFocus={() => (restoreFocus.current && !blocked() ? input.current : false)}
                        aria-label={`Choose ${props.label}`}
                    >
                        <PopoverTitle className={props.kind === 'date' ? 'sr-only' : undefined}>
                            {props.label}
                        </PopoverTitle>
                        {/* eslint-disable-next-line react/refs -- The factory renders controls; selection runs only from their event handlers. */}
                        {props.picker(validValue ? field.value : undefined, select)}
                        {props.kind === 'time' && (
                            <Button
                                type="button"
                                variant="outline"
                                className="view-temporal-close"
                                onClick={() => setOpen(false)}
                            >
                                Save
                            </Button>
                        )}
                    </PopoverContent>
                </Popover>
                {props.kind === 'time' && (
                    <span className="sr-only" role="status">
                        {validValue && field.value ? props.format(field.value) : ''}
                    </span>
                )}
            </Field>
        </FormField>
    );
}

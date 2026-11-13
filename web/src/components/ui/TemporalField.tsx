import { useValue } from './value';
import { flushSync } from 'react-dom';
import { FormField } from './FormField';
import { FieldLabel } from './FieldLabel';
import type { FieldProps } from './types';
import { Button } from '@base-ui/react/button';
import { Popover } from '@base-ui/react/popover';
import { Input } from '@/components/shadcn/input';
import { CalendarDays, Clock, X } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from 'react';

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

    // Keep the sheet modal only while the primary pointer is coarse, matching its CSS presentation.
    useEffect(() => {
        const media = window.matchMedia('(pointer: coarse)');
        const change = () => setCoarse(media.matches);

        change();
        media.addEventListener('change', change);

        return () => media.removeEventListener('change', change);
    }, []);

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
            <div className="view-text-field" data-disabled={props.disabled || undefined}>
                <FieldLabel
                    controlId={id}
                    label={props.label}
                    description={props.description}
                    required={props.required}
                />
                <Popover.Root
                    open={open}
                    onOpenChange={(next, details) => {
                        if (next && blocked()) return;
                        restoreFocus.current = details.reason !== 'outside-press' && details.reason !== 'focus-out';
                        setOpen(next);
                    }}
                    modal={coarse ? true : 'trap-focus'}
                >
                    <div className="view-text-input view-temporal-input">
                        <Input
                            variant="view"
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
                        {(text || field.value) && !props.disabled && (
                            <Button
                                type="button"
                                className="view-text-input-clear"
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
                            </Button>
                        )}
                        <Popover.Trigger
                            type="button"
                            className="view-temporal-trigger"
                            aria-label={`Choose ${props.label}`}
                            aria-disabled={props.disabled || undefined}
                            onClick={(event) => {
                                if (blocked()) event.preventDefault();
                            }}
                        >
                            {props.kind === 'date' ? <CalendarDays aria-hidden="true" /> : <Clock aria-hidden="true" />}
                        </Popover.Trigger>
                    </div>
                    <Popover.Portal>
                        <Popover.Backdrop className="view-temporal-backdrop" />
                        <Popover.Positioner sideOffset={4} align="start" className="view-temporal-positioner">
                            <Popover.Popup
                                className="view-temporal-popup"
                                initialFocus={props.kind === 'date' ? false : true}
                                finalFocus={() => (restoreFocus.current && !blocked() ? input.current : false)}
                                aria-label={`Choose ${props.label}`}
                            >
                                <Popover.Title className="view-temporal-title">{props.label}</Popover.Title>
                                {/* eslint-disable-next-line react/refs -- The factory renders controls; selection runs only from their event handlers. */}
                                {props.picker(validValue ? field.value : undefined, select)}
                                <Popover.Close type="button" className="view-temporal-close">
                                    {props.kind === 'time' ? 'Save' : 'Close'}
                                </Popover.Close>
                            </Popover.Popup>
                        </Popover.Positioner>
                    </Popover.Portal>
                </Popover.Root>
                {props.kind === 'time' && (
                    <span className="sr-only" role="status">
                        {validValue && field.value ? props.format(field.value) : ''}
                    </span>
                )}
            </div>
        </FormField>
    );
}

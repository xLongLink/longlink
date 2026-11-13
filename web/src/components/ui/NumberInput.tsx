import { X } from 'lucide-react';
import { useValue } from './value';
import { flushSync } from 'react-dom';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { normalizeDigits } from './digits';
import { useEffect, useId, useRef, useState } from 'react';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/shadcn/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
} from '@/components/shadcn/input-group';

type NumberInputProps = FieldProps & {
    value?: number | null;
    defaultValue?: number;
    onChange?: (value: number | null) => void;
    min?: number | null;
    max?: number | null;
    step?: number | null;
    placeholder?: string;
    units?: string | null;
    isIntegerOnly?: boolean;
    autoComplete?: string;
};

/** Uses the active document language, falling back to English for absent or invalid language tags. */
function numberFormat(locale: string) {
    try {
        return new Intl.NumberFormat(locale || 'en');
    } catch {
        return new Intl.NumberFormat('en');
    }
}

/** Validates decimal and grouping positions before removing separators from a pasted number. */
function readNumber(core: string, group: string, decimal: string, primary: number, secondary: number, minimum = 1) {
    const parts = decimal ? core.split(decimal) : [core];

    if (parts.length > 2 || (parts[1] !== undefined && !/^\d*$/.test(parts[1]))) return null;
    const integer = parts[0];
    const groups = group ? integer.split(group) : [integer];

    if (groups.length > 1) {
        if (
            groups.length - 1 < minimum ||
            !groups.every((part) => /^\d+$/.test(part)) ||
            groups[0].length > secondary ||
            groups.at(-1)?.length !== primary ||
            groups.slice(1, -1).some((part) => part.length !== secondary)
        )
            return null;
    } else if (!/^\d*$/.test(integer)) return null;
    const digits = groups.join('');

    if (!digits && !parts[1]) return null;

    return parts[1] === undefined ? digits : `${digits}.${parts[1]}`;
}

/** Reads locale-first grouping, machine decimals, and unambiguous spreadsheet grouping without guessing. */
function parseNumber(text: string, locale: string, integerOnly?: boolean) {
    const format = numberFormat(locale);
    const parts = format.formatToParts(12345.6);
    const group = (parts.find((part) => part.type === 'group')?.value ?? ',').normalize('NFKC');
    const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
    const sizes = format.formatToParts(11111111111).filter((part) => part.type === 'integer');
    const primary = sizes.at(-1)?.value.length ?? 3;
    const secondary = sizes.at(-2)?.value.length ?? primary;
    let core = normalizeDigits(text);

    if (core === null) return null;
    const accounting = core.startsWith('(') && core.endsWith(')');

    if (accounting) core = core.slice(1, -1).trim();
    core = core.replace(/^\p{Sc}\s*|\s*\p{Sc}$/gu, '');
    const sign = /^([+\-−‒–])\s*|\s*([+\-−‒–])$/u.exec(core);

    if (accounting && sign) return null;

    if (sign) core = core.replace(sign[0], '').trim();
    core = core.replace(/^\p{Sc}\s*|\s*\p{Sc}$/gu, '');
    const exponent = /\s*[eE]\s*([+-]?\d+)$/.exec(core);

    if (exponent) core = core.slice(0, exponent.index).trim();

    if (!/^[\d,.' ’٫٬]+$/.test(core)) return null;
    let plain = readNumber(core, group, decimal, primary, secondary);

    if (plain === null && /^(?:\d+\.?\d*|\.\d+)$/.test(core)) plain = core;

    // Space/apostrophe groups are unambiguous; other foreign grouping needs repeated separators.
    if (plain === null) {
        const separators = [...new Set(core.replace(/\d/g, ''))];

        if (separators.length > 2) return null;

        for (const separator of separators) {
            const other = separators.find((candidate) => candidate !== separator) ?? '';

            if (other && core.split(other).length !== 2) continue;
            plain = readNumber(core, separator, other, 3, 3, /^[ '’]$/.test(separator) ? 1 : 2);

            if (plain !== null) break;
        }
    }

    if (plain === null) return null;
    const negative = accounting || (sign && (sign[1] ?? sign[2]) !== '+');
    const value = Number(`${negative ? '-' : ''}${plain}${exponent ? `e${exponent[1]}` : ''}`);

    return Number.isFinite(value) && (!integerOnly || Number.isInteger(value)) ? value : null;
}

/** Counts decimal places including scientific-notation steps without rounding significant integer digits. */
function decimalPlaces(value: number) {
    const [coefficient, exponent] = String(value).toLowerCase().split('e');

    return Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent ?? 0));
}

/** Edits numeric drafts, committing on blur or Enter; wheel gestures never change the value. */
export function NumberInput(props: NumberInputProps) {
    const field = useValue<number | null>(props.value, props.defaultValue ?? null, props.onChange);
    const input = useRef<HTMLInputElement>(null);
    const id = useId();
    const [draft, setDraft] = useState<{ value: number | null; text: string; locale: string } | null>(null);

    // Caller replacements and disabled transitions discard drafts instead of masking the owned value.
    if (draft && (!Object.is(draft.value, field.value) || props.disabled)) setDraft(null);
    const text = draft?.text ?? (field.value === null ? '' : String(field.value));

    const parsed = draft
        ? parseNumber(text, draft.locale, props.isIntegerOnly)
        : field.value !== null &&
            Number.isFinite(field.value) &&
            (!props.isIntegerOnly || Number.isInteger(field.value))
          ? field.value
          : null;

    const invalid =
        text.trim() !== '' &&
        (parsed === null || (props.min != null && parsed < props.min) || (props.max != null && parsed > props.max));

    // Both controlled and local fields abandon pending edits only after an accepted form reset.
    useEffect(() => {
        const form = field.ref.current?.closest('form');

        if (!form) return;

        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (!event.defaultPrevented) setDraft(null);
            });
        };

        form.addEventListener('reset', reset);

        return () => form.removeEventListener('reset', reset);
    }, [field.ref]);

    /** Rejects malformed edits, clamps valid numbers, and lets controlled callers decline the result. */
    function commit(blur: boolean) {
        if (blur) setDraft(null);

        if (!draft || props.disabled) return;
        const min = props.min == null ? -Infinity : props.isIntegerOnly ? Math.ceil(props.min) : props.min;
        const max = props.max == null ? Infinity : props.isIntegerOnly ? Math.floor(props.max) : props.max;

        if ((text.trim() !== '' && parsed === null) || min > max) return;
        const next = parsed === null ? null : Math.min(max, Math.max(min, parsed));
        setDraft(null);

        if (next !== field.value) field.onChange(next);
    }

    // FormField owns required and draft validation; the editable input owns native serialization.
    return (
        <FormField
            {...props}
            fieldRef={field.ref}
            values={[text.trim() === '' ? '' : text]}
            error={invalid ? 'Enter a number within the allowed range.' : undefined}
        >
            <Field data-disabled={props.disabled || undefined}>
                <FieldLabel htmlFor={id}>
                    <FieldContent>
                        <span id={`${id}-label`} className="flex items-center gap-2">
                            {props.label}
                            {props.required && (
                                <span className="text-muted-foreground font-normal">
                                    <span aria-hidden="true"> · </span>Required
                                </span>
                            )}
                        </span>
                        {props.description && (
                            <FieldDescription id={`${id}-description`}>{props.description}</FieldDescription>
                        )}
                    </FieldContent>
                </FieldLabel>
                <InputGroup
                    className={props.disabled ? 'opacity-50' : undefined}
                    onClick={() => {
                        if (!props.disabled) input.current?.focus({ preventScroll: true });
                    }}
                >
                    <InputGroupInput
                        ref={input}
                        id={id}
                        type="text"
                        role="spinbutton"
                        inputMode={props.isIntegerOnly ? 'numeric' : 'decimal'}
                        name={props.disabled ? undefined : props.name}
                        value={text}
                        placeholder={props.placeholder}
                        autoComplete={props.autoComplete}
                        aria-disabled={props.disabled || undefined}
                        readOnly={props.disabled || undefined}
                        aria-required={props.required || undefined}
                        aria-invalid={invalid || undefined}
                        aria-valuemin={props.min ?? undefined}
                        aria-valuemax={props.max ?? undefined}
                        aria-valuenow={field.value ?? undefined}
                        aria-labelledby={`${id}-label`}
                        aria-describedby={
                            [props.description && `${id}-description`, props.units && `${id}-units`]
                                .filter(Boolean)
                                .join(' ') || undefined
                        }
                        onChange={(event) => {
                            if (!props.disabled)
                                setDraft({
                                    value: field.value,
                                    text: event.target.value,
                                    locale: event.currentTarget.ownerDocument.documentElement.lang,
                                });
                        }}
                        onFocus={(event) => {
                            if (draft || field.value === null || props.disabled) return;

                            const decimal =
                                numberFormat(event.currentTarget.ownerDocument.documentElement.lang)
                                    .formatToParts(1.1)
                                    .find((part) => part.type === 'decimal')?.value ?? '.';

                            setDraft({
                                value: field.value,
                                text: String(field.value).replace('.', decimal),
                                locale: event.currentTarget.ownerDocument.documentElement.lang,
                            });
                        }}
                        onBlur={() => commit(true)}
                        onKeyDown={(event) => {
                            // Disabled fields remain focusable without editing or implicit submission.
                            if (props.disabled) {
                                if (event.key === 'Enter') event.preventDefault();

                                return;
                            }

                            // Composition and modified arrows belong to the text editor, not numeric stepping.
                            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;

                            // Native implicit submission must serialize the accepted value, not a stale draft.
                            if (event.key === 'Enter') flushSync(() => commit(false));

                            if (
                                (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') ||
                                event.altKey ||
                                event.ctrlKey ||
                                event.metaKey ||
                                event.shiftKey
                            )
                                return;
                            event.preventDefault();
                            const direction = event.key === 'ArrowUp' ? 1 : -1;

                            const step =
                                props.step != null &&
                                Number.isFinite(props.step) &&
                                props.step > 0 &&
                                (!props.isIntegerOnly || Number.isInteger(props.step))
                                    ? props.step
                                    : 1;

                            const base =
                                props.min != null && (!props.isIntegerOnly || Number.isInteger(props.min))
                                    ? props.min
                                    : 0;

                            const current = text.trim() === '' ? null : invalid ? field.value : parsed;
                            const position = current === null ? 0 : (current - base) / step;
                            const tolerance = Math.min(0.25, Number.EPSILON * Math.max(1, Math.abs(position)) * 4);

                            const nextPosition =
                                direction === 1
                                    ? Math.floor(position + tolerance) + 1
                                    : Math.ceil(position - tolerance) - 1;

                            const precision = Math.min(12, Math.max(decimalPlaces(step), decimalPlaces(base)));

                            const stepped =
                                current === null
                                    ? direction === 1
                                        ? (props.min ?? 0)
                                        : (props.max ?? 0)
                                    : Number((base + nextPosition * step).toFixed(precision));

                            const rounded =
                                current === null && props.isIntegerOnly
                                    ? direction === 1
                                        ? Math.ceil(stepped)
                                        : Math.floor(stepped)
                                    : stepped;

                            const next = Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, rounded));

                            if (!Number.isFinite(next) || (props.isIntegerOnly && !Number.isInteger(next))) return;
                            setDraft(null);

                            if (next !== field.value) field.onChange(next);
                        }}
                    />
                    {props.units && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupText id={`${id}-units`}>{props.units}</InputGroupText>
                        </InputGroupAddon>
                    )}
                    {field.value !== null && !props.disabled && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label={`Clear ${props.label}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setDraft(null);
                                    field.onChange(null);
                                    input.current?.focus({ preventScroll: true });
                                }}
                            >
                                <X aria-hidden="true" />
                            </InputGroupButton>
                        </InputGroupAddon>
                    )}
                </InputGroup>
            </Field>
        </FormField>
    );
}

import { cn } from '@/lib/utils';
import { Calendar } from '@/ui/calendar';
import { Input as UIInput } from '@/ui/input';
import { Label } from '@/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Textarea } from '@/ui/textarea';
import type { XmlComponentProps } from '@/xml';
import { evaluate, resolveBinding, useContext } from '@/xml';
import { format, isValid, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type InputProps = {
    name?: string;
    kind?: 'text' | 'number' | 'password' | 'textarea' | 'date' | 'datetime';
    label?: string;
    value?: string | number | boolean;
    onChange?: (value: string) => void;
    placeholder?: string;
    description?: string;
    required?: boolean;
    disabled?: boolean;
};

const DATE_FORMAT = 'yyyy-MM-dd';
const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

const parseDateValue = (rawValue: string): Date | undefined => {
    if (!rawValue) return undefined;
    const parsed = parse(rawValue.slice(0, 10), DATE_FORMAT, new Date());
    return isValid(parsed) ? parsed : undefined;
};

const parseDatetimeValue = (rawValue: string): { date?: Date; time: string } => {
    if (!rawValue) return { date: undefined, time: '00:00' };
    const parsed = parse(rawValue.slice(0, 16), DATETIME_FORMAT, new Date());
    if (isValid(parsed)) return { date: parsed, time: format(parsed, 'HH:mm') };
    return { date: parseDateValue(rawValue), time: rawValue.slice(11, 16) || '00:00' };
};

/** Renders an XML input control from evaluated XML props. */
export function Input({ props: rawProps }: XmlComponentProps) {
    const { ctx } = useContext();
    const name = String(evaluate(rawProps.name ?? '', ctx) ?? '');
    const kind = String(evaluate(rawProps.kind ?? '', ctx) ?? 'text') as InputProps['kind'];
    const label = String(evaluate(rawProps.label ?? '', ctx) ?? '');
    const placeholder = String(evaluate(rawProps.placeholder ?? '', ctx) ?? '');
    const description = String(evaluate(rawProps.description ?? '', ctx) ?? '');
    const required = Boolean(evaluate(rawProps.required ?? '', ctx) ?? false);
    const disabled = Boolean(evaluate(rawProps.disabled ?? '', ctx) ?? false);

    /* Resolve value binding for two-way data sync */
    const valueProp = rawProps.value ?? '';
    let value: unknown = evaluate(valueProp, ctx);
    let bindingState: Record<string, unknown> | undefined;
    let bindingPath: string[] = [];
    if (valueProp.startsWith('$')) {
        try {
            const normalized = valueProp.slice(1).trim();
            value = resolveBinding(normalized, ctx);

            const dotIndex = normalized.indexOf('.');
            const stateKey = dotIndex === -1 ? normalized : normalized.slice(0, dotIndex);
            bindingState = ctx[stateKey] as Record<string, unknown> | undefined;
            bindingPath = dotIndex === -1 ? [] : normalized.slice(dotIndex + 1).split('.');
        } catch {
            // Use evaluated value if binding fails
        }
    }

    const defaultFieldValue = useMemo(
        () => (typeof value === 'string' || typeof value === 'number' ? String(value) : ''),
        [value]
    );
    const [textValue, setTextValue] = useState(defaultFieldValue);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
        kind === 'date' ? parseDateValue(defaultFieldValue) : undefined
    );
    const [selectedDateTime, setSelectedDateTime] = useState<{ date?: Date; time: string } | undefined>(() =>
        kind === 'datetime' ? parseDatetimeValue(defaultFieldValue) : undefined
    );

    /* Write directly into the Valtio proxy for bound fields. */
    const updateBinding = (nextValue: string) => {
        if (!bindingState) return;

        if (bindingPath.length === 0) {
            bindingState.value = nextValue;
            return;
        }

        let current: Record<string, unknown> = bindingState;
        for (let index = 0; index < bindingPath.length - 1; index += 1) {
            const key = bindingPath[index]!;
            const next = current[key];
            current[key] = next && typeof next === 'object' ? (next as Record<string, unknown>) : {};
            current = current[key] as Record<string, unknown>;
        }

        current[bindingPath[bindingPath.length - 1]!] = nextValue;
    };
    useEffect(() => {
        if (kind === 'date') {
            setSelectedDate(parseDateValue(defaultFieldValue));
            return;
        }
        if (kind === 'datetime') {
            setSelectedDateTime(parseDatetimeValue(defaultFieldValue));
            return;
        }
        setTextValue(defaultFieldValue);
    }, [defaultFieldValue, kind]);
    const renderControl = () => {
        if (kind === 'textarea')
            return (
                <Textarea
                    name={name}
                    placeholder={placeholder}
                    value={textValue}
                    required={required}
                    disabled={disabled}
                    onChange={(event) => {
                        const nextValue = event.currentTarget.value;
                        setTextValue(nextValue);
                        updateBinding(nextValue);
                    }}
                />
            );
        if (kind === 'date')
            return (
                <Popover>
                    <PopoverTrigger
                        disabled={disabled}
                        className={cn(
                            'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring inline-flex h-9 w-full items-center justify-start rounded-md border px-3 py-2 text-sm font-normal shadow-xs focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
                            !selectedDate && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 size-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : <span>{placeholder ?? 'Pick a date'}</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(nextDate) => {
                                const nextValue = nextDate ? format(nextDate, DATE_FORMAT) : '';
                                setSelectedDate(nextDate);
                                updateBinding(nextValue);
                            }}
                        />
                    </PopoverContent>
                </Popover>
            );
        if (kind === 'datetime') {
            const datetimeValue = selectedDateTime ?? { date: undefined, time: '00:00' };
            return (
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger
                            disabled={disabled}
                            className={cn(
                                'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring inline-flex h-9 w-full items-center justify-start rounded-md border px-3 py-2 text-sm font-normal shadow-xs focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
                                !datetimeValue.date && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 size-4" />
                            {datetimeValue.date ? (
                                format(datetimeValue.date, 'PPP')
                            ) : (
                                <span>{placeholder ?? 'Pick a date'}</span>
                            )}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={datetimeValue.date}
                                onSelect={(nextDate) => {
                                    const nextValue = { ...datetimeValue, date: nextDate };
                                    const formattedValue = nextDate
                                        ? format(
                                              new Date(`${format(nextDate, DATE_FORMAT)}T${nextValue.time}`),
                                              DATETIME_FORMAT
                                          )
                                        : '';

                                    setSelectedDateTime(nextValue);
                                    updateBinding(formattedValue);
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                    <UIInput
                        name={name}
                        type="time"
                        value={datetimeValue.time}
                        required={required}
                        disabled={disabled}
                        className="w-36 shrink-0"
                        onChange={(event) => {
                            const nextTime = event.currentTarget.value;
                            setSelectedDateTime({ ...datetimeValue, time: nextTime });
                            updateBinding(nextTime);
                        }}
                        onBlur={(event) => {
                            if (!datetimeValue.date) return;
                            updateBinding(
                                format(
                                    new Date(`${format(datetimeValue.date, DATE_FORMAT)}T${event.currentTarget.value}`),
                                    DATETIME_FORMAT
                                )
                            );
                        }}
                    />
                </div>
            );
        }
        return (
            <UIInput
                name={name}
                type={kind}
                placeholder={placeholder}
                value={textValue}
                required={required}
                disabled={disabled}
                onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    setTextValue(nextValue);
                    updateBinding(nextValue);
                }}
            />
        );
    };
    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}
            {renderControl()}
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}

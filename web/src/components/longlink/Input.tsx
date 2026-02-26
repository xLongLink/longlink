import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { format, isValid, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input as UIInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

type InputProps = {
    name?: string;
    kind?: 'text' | 'number' | 'password' | 'textarea' | 'date' | 'datetime';
    label?: string;
    value?: string | number | boolean;
    placeholder?: string;
    description?: string;
    required?: boolean;
    disabled?: boolean;
    submit?: string;
};

const DATE_FORMAT = 'yyyy-MM-dd';
const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

const parseDateValue = (rawValue: string): Date | undefined => {
    if (!rawValue) {
        return undefined;
    }

    const parsed = parse(rawValue.slice(0, 10), DATE_FORMAT, new Date());

    return isValid(parsed) ? parsed : undefined;
};

const parseDatetimeValue = (
    rawValue: string
): { date?: Date; time: string } => {
    if (!rawValue) {
        return { date: undefined, time: '00:00' };
    }

    const parsed = parse(rawValue.slice(0, 16), DATETIME_FORMAT, new Date());

    if (isValid(parsed)) {
        return { date: parsed, time: format(parsed, 'HH:mm') };
    }

    return {
        date: parseDateValue(rawValue),
        time: rawValue.slice(11, 16) || '00:00',
    };
};

export function Input({
    name,
    kind = 'text',
    label,
    value,
    placeholder,
    description,
    required,
    disabled,
    submit,
}: InputProps) {
    const { app } = useParams();
    const defaultFieldValue = useMemo(() => {
        if (typeof value === 'string' || typeof value === 'number') {
            return String(value);
        }

        return '';
    }, [value]);
    const previousValueRef = useRef(defaultFieldValue);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
        kind === 'date' ? parseDateValue(defaultFieldValue) : undefined
    );
    const [selectedDateTime, setSelectedDateTime] = useState<
        { date?: Date; time: string } | undefined
    >(() =>
        kind === 'datetime' ? parseDatetimeValue(defaultFieldValue) : undefined
    );

    const normalizedSubmitPath = (submit ?? '').replace(/^\/+|\/+$/g, '');

    const handleBlur = async (nextValue: string) => {
        if (
            !app ||
            !normalizedSubmitPath ||
            nextValue === previousValueRef.current
        ) {
            return;
        }

        previousValueRef.current = nextValue;

        await apiFetch(`/apps/${app}/${normalizedSubmitPath}`, {
            method: 'POST',
            body: {
                ...(name ? { name } : {}),
                value: nextValue,
            },
        });
    };

    const renderControl = () => {
        if (kind === 'textarea') {
            return (
                <Textarea
                    name={name}
                    placeholder={placeholder}
                    defaultValue={defaultFieldValue}
                    required={required}
                    disabled={disabled}
                    onBlur={(event) => {
                        void handleBlur(event.currentTarget.value);
                    }}
                />
            );
        }

        if (kind === 'date') {
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
                        {selectedDate ? (
                            format(selectedDate, 'PPP')
                        ) : (
                            <span>{placeholder ?? 'Pick a date'}</span>
                        )}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(nextDate) => {
                                setSelectedDate(nextDate);
                                void handleBlur(
                                    nextDate
                                        ? format(nextDate, DATE_FORMAT)
                                        : ''
                                );
                            }}
                        />
                    </PopoverContent>
                </Popover>
            );
        }

        if (kind === 'datetime') {
            const datetimeValue = selectedDateTime ?? {
                date: undefined,
                time: '00:00',
            };

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
                                    const nextValue = {
                                        ...datetimeValue,
                                        date: nextDate,
                                    };

                                    setSelectedDateTime(nextValue);
                                    void handleBlur(
                                        nextDate
                                            ? format(
                                                  new Date(
                                                      `${format(nextDate, DATE_FORMAT)}T${nextValue.time}`
                                                  ),
                                                  DATETIME_FORMAT
                                              )
                                            : ''
                                    );
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
                            setSelectedDateTime({
                                ...datetimeValue,
                                time: nextTime,
                            });
                        }}
                        onBlur={(event) => {
                            if (!datetimeValue.date) {
                                return;
                            }

                            void handleBlur(
                                format(
                                    new Date(
                                        `${format(datetimeValue.date, DATE_FORMAT)}T${event.currentTarget.value}`
                                    ),
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
                defaultValue={defaultFieldValue}
                required={required}
                disabled={disabled}
                onBlur={(event) => {
                    void handleBlur(event.currentTarget.value);
                }}
            />
        );
    };

    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}

            {renderControl()}

            {description ? (
                <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
        </div>
    );
}

export default Input;

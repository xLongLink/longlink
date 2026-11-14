import { useState } from 'react';
import { Picker } from './picker';
import type { FieldProps } from './types';
import { TemporalField } from './temporal-field';
import { displayTime, readTime, timeSeconds, timeFromSeconds, type ISOTimeString } from './temporal';

/** Selects a precise time with keyboard-operable hour, minute and optional second controls. */
function TimePicker({
    value,
    seconds,
    hourFormat,
    select
}: {
    value?: ISOTimeString;
    seconds: boolean;
    hourFormat: '12h' | '24h';
    select: (value: ISOTimeString) => void;
}) {
    const [fallback] = useState(() => {
        const now = new Date();

        return [now.getHours(), now.getMinutes(), now.getSeconds()].join(':');
    });

    const parts = (value ?? fallback).split(':');
    const hour = Number(parts[0]);

    // Reuse the trusted themed picker without giving display parts submission names.
    return (
        <div className="flex max-w-[calc(var(--spacing-8)*10)] flex-wrap gap-2 [&>.view-text-field]:w-auto [&>.view-text-field]:min-w-[calc(var(--spacing-8)*2)] [&>.view-text-field]:flex-1">
            {['Hour', 'Minute', ...(seconds ? ['Second'] : [])].map((label, index) => (
                <Picker
                    key={label}
                    label={label}
                    value={
                        index === 0 && hourFormat === '12h'
                            ? String(hour % 12 || 12)
                            : String(Number(parts[index] ?? 0))
                    }
                    onChange={(value) => {
                        if (value === null) return;
                        const next = [...parts];
                        const number = Number(value);
                        next[index] = String(
                            index === 0 && hourFormat === '12h' ? (number % 12) + (hour >= 12 ? 12 : 0) : number
                        ).padStart(2, '0');
                        const candidate = readTime(next.join(':'), seconds);

                        if (candidate) select(candidate);
                    }}
                    options={Array.from(
                        { length: index === 0 ? (hourFormat === '12h' ? 12 : 24) : 60 },
                        (_, number) => {
                            const option = index === 0 && hourFormat === '12h' ? number + 1 : number;

                            return { value: String(option), label: String(option).padStart(2, '0') };
                        }
                    )}
                />
            ))}
            {hourFormat === '12h' && (
                <Picker
                    label="Period"
                    value={hour >= 12 ? 'PM' : 'AM'}
                    onChange={(value) => {
                        if (value === null) return;
                        const next = [...parts];
                        next[0] = String((hour % 12) + (value === 'PM' ? 12 : 0)).padStart(2, '0');
                        const candidate = readTime(next.join(':'), seconds);

                        if (candidate) select(candidate);
                    }}
                    options={['AM', 'PM']}
                />
            )}
        </div>
    );
}

/** Edits canonical times with inclusive second-aware bounds and minute arrow-key increments. */
export function TimeInput(
    props: FieldProps & {
        value?: ISOTimeString;
        defaultValue?: ISOTimeString;
        onChange?: (value: ISOTimeString | undefined) => void;
        min?: ISOTimeString;
        max?: ISOTimeString;
        hasSeconds?: boolean;
        hourFormat?: '12h' | '24h';
        increment?: number;
        placeholder?: string;
    }
) {
    const seconds = props.hasSeconds ?? false;
    const hourFormat = props.hourFormat ?? '12h';
    const min = props.min ? timeSeconds(props.min) : 0;
    const max = props.max ? timeSeconds(props.max) : 86399;

    const accepts = (value: ISOTimeString) => {
        const totalSeconds = timeSeconds(value);

        return totalSeconds >= min && totalSeconds <= max;
    };

    return (
        <TemporalField
            label={props.label}
            description={props.description}
            name={props.name}
            required={props.required}
            disabled={props.disabled}
            value={props.value}
            defaultValue={props.defaultValue}
            onChange={props.onChange}
            controlled={Object.hasOwn(props, 'value')}
            kind="time"
            placeholder={props.placeholder ?? 'Select a time'}
            parse={(text) => readTime(text, seconds)}
            format={(value) => displayTime(value, seconds, hourFormat)}
            accepts={accepts}
            step={(value, direction) => {
                const increment = props.increment ?? 1;

                if (!Number.isInteger(increment)) return null;
                const now = new Date();

                const current = value
                    ? timeSeconds(value)
                    : now.getHours() * 3600 + now.getMinutes() * 60 + (seconds ? now.getSeconds() : 0);

                const next = (((current + direction * increment * 60) % 86400) + 86400) % 86400;

                return timeFromSeconds(next, seconds);
            }}
            picker={(value, select) => (
                <TimePicker
                    value={value}
                    seconds={seconds}
                    hourFormat={hourFormat}
                    select={(candidate) => {
                        const total = Math.min(max, Math.max(min, timeSeconds(candidate)));
                        const next = timeFromSeconds(total, seconds);

                        if (next) select(next, false);
                    }}
                />
            )}
        />
    );
}

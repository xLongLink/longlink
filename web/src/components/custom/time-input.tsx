import type { FieldProps } from './types';
import { TemporalField } from './temporal-field';
import { TimePicker, TimePickerColumns, TimePickerPanel } from '@/components/reui/time-picker';
import { displayTime, readTime, timeSeconds, timeFromSeconds, type ISOTimeString } from './temporal';

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
                    value={value ?? null}
                    hourCycle={hourFormat === '12h' ? 12 : 24}
                    granularity={seconds ? 'second' : 'minute'}
                    min={props.min}
                    max={props.max}
                    disabled={props.disabled}
                    onValueChange={(candidate) => {
                        const next = candidate ? readTime(candidate, seconds) : null;

                        if (next) select(next, false);
                    }}
                >
                    <TimePickerPanel>
                        <TimePickerColumns />
                    </TimePickerPanel>
                </TimePicker>
            )}
        />
    );
}

import type { FieldProps } from './types';
import { format, parseISO } from 'date-fns';
import { TemporalField } from './TemporalField';
import { Calendar } from '@/components/shadcn/calendar';
import { displayDate, readDate, validDate, type ISODateString } from './temporal';

/** Selects or types a real calendar date using inclusive bounds and additional constraints. */
export function DateInput(
    props: FieldProps & {
        value?: ISODateString;
        defaultValue?: ISODateString;
        onChange?: (value: ISODateString | undefined) => void;
        min?: ISODateString;
        max?: ISODateString;
        dateConstraints?: readonly ((date: Date) => boolean)[];
        placeholder?: string;
    }
) {
    // Every entry path, including caller values, uses the same calendar constraints.
    const validBounds = (!props.min || validDate(props.min)) && (!props.max || validDate(props.max));

    const accepts = (value: string): value is ISODateString =>
        validBounds &&
        validDate(value) &&
        (!props.min || value >= props.min) &&
        (!props.max || value <= props.max) &&
        (props.dateConstraints?.every((constraint) => constraint(parseISO(value))) ?? true);

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
            kind="date"
            placeholder={props.placeholder ?? 'Select a date'}
            parse={readDate}
            isComplete={(text) => /(?:^\d{4}-\d{1,2}-\d{1,2}|\b\d{4})\s*$/.test(text)}
            format={displayDate}
            accepts={accepts}
            picker={(value, select) => (
                <Calendar
                    mode="single"
                    selected={value ? parseISO(value) : undefined}
                    startMonth={props.min && validDate(props.min) ? parseISO(props.min) : undefined}
                    endMonth={props.max && validDate(props.max) ? parseISO(props.max) : undefined}
                    defaultMonth={
                        value ? parseISO(value) : props.min && validDate(props.min) ? parseISO(props.min) : undefined
                    }
                    weekStartsOn={0}
                    autoFocus
                    showOutsideDays
                    disabled={(date) => {
                        const value = format(date, 'yyyy-MM-dd');

                        return !accepts(value);
                    }}
                    onSelect={(date) => {
                        if (!date) return;
                        const value = format(date, 'yyyy-MM-dd');

                        if (accepts(value)) select(value);
                    }}
                />
            )}
        />
    );
}

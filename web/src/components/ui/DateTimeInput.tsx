import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
import { DateTimeInput as AstryxDateTimeInput, type ISODateTimeString } from '@astryxdesign/core/DateTimeInput';

/** Selects a constrained date and time without custom picker presentation. */
export function DateTimeInput(
    props: FieldProps & {
        value?: ISODateTimeString;
        onChange: (value: ISODateTimeString | undefined) => void;
        min?: ISODateTimeString;
        max?: ISODateTimeString;
        placeholder?: string;
        hasClear?: boolean;
        hasSeconds?: boolean;
        hourFormat?: '12h' | '24h';
        size?: 'sm' | 'md' | 'lg';
    }
) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Show minute precision by default without supplying a controlled datetime value.
    return (
        <AstryxDateTimeInput
            {...props}
            size={size}
            placeholder={props.placeholder ?? 'Select a date'}
            hasClear={props.hasClear ?? false}
            hasSeconds={props.hasSeconds ?? false}
            hourFormat={props.hourFormat ?? '12h'}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}

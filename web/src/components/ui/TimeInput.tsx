import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
import { TimeInput as AstryxTimeInput, type ISOTimeString } from '@astryxdesign/core/TimeInput';

/** Selects a constrained time using the standard picker. */
export function TimeInput(
    props: FieldProps & {
        value?: ISOTimeString;
        onChange?: (value: ISOTimeString | undefined) => void;
        min?: ISOTimeString;
        max?: ISOTimeString;
        hasSeconds?: boolean;
        hasClear?: boolean;
        hourFormat?: '12h' | '24h';
        increment?: number;
        placeholder?: string;
        size?: 'sm' | 'md' | 'lg';
    }
) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Default to minute precision while keeping the selected time controlled by the Solution.
    return (
        <AstryxTimeInput
            {...props}
            size={size}
            placeholder={props.placeholder ?? 'Select a time'}
            hasSeconds={props.hasSeconds ?? false}
            hasClear={props.hasClear ?? false}
            hourFormat={props.hourFormat ?? '12h'}
            increment={props.increment ?? 1}
            isLabelHidden={false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}

import type { FieldProps } from './types';
import type { SelectorOptionType } from './Selector';
import { useSize } from '@astryxdesign/core/SizeContext';
import { MultiSelector as AstryxMultiSelector } from '@astryxdesign/core/MultiSelector';

/** Selects multiple values using standard option and selected-value rendering. */
export function MultiSelector(
    props: FieldProps & {
        options: SelectorOptionType[];
        value: string[];
        onChange: (value: string[]) => void;
        placeholder?: string;
        size?: 'sm' | 'md' | 'lg';
        hasSelectAll?: boolean;
        hasSearch?: boolean;
        isReadOnly?: boolean;
        htmlName?: string;
        hasClear?: boolean;
    }
) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Start with a plain multi-select; extra controls remain opt-in.
    return (
        <AstryxMultiSelector
            {...props}
            size={size}
            placeholder={props.placeholder ?? 'Select...'}
            hasSelectAll={props.hasSelectAll ?? false}
            hasSearch={props.hasSearch ?? false}
            hasClear={props.hasClear ?? false}
            isReadOnly={props.isReadOnly ?? false}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}

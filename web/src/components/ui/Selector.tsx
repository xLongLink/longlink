import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { selectorOptions, type SelectorOptionType } from './options';
import { Selector as AstryxSelector } from '@/components/astryx/Selector';

export type { SelectorOptionData, SelectorOptionType } from './options';

type SelectorProps = FieldProps & {
    options: SelectorOptionType[];
    value?: string | null;
    defaultValue?: string;
    onChange?: (value: string | null) => void;
    hasSearch?: boolean;
    hasClear?: boolean;
    placeholder?: string;
};

/** Selects one value without custom option rendering or popup geometry. */
export function Selector(props: SelectorProps) {
    // Retain search, option presentation, and clearing while adapting optional local state.
    const { defaultValue, ...control } = props;

    const field = useValue<string | null>(props.value, defaultValue ?? null, props.onChange);

    // Default presentation without overriding the clearable-value callback contract.
    return (
        <FormField {...props} fieldRef={field.ref} values={[field.value ?? '']}>
            <AstryxSelector
                {...control}
                width="100%"
                options={selectorOptions(props.options)}
                size="md"
                {...(props.hasClear === false
                    ? { hasClear: false as const, value: field.value ?? undefined }
                    : { hasClear: true as const, value: field.value })}
                onChange={field.onChange}
                htmlName={props.name}
                placeholder={props.placeholder ?? 'Select...'}
                hasSearch={props.hasSearch ?? false}
                isReadOnly={false}
                isLabelHidden={false}
                isRequired={props.required ?? false}
                isDisabled={props.disabled ?? false}
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}

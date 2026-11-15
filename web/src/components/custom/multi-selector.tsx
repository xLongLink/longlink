import { Icon } from './icon';
import { useId, type ReactNode } from 'react';
import { useValue } from '@/components/custom/value';
import type { FieldProps } from '@/components/custom/types';
import { selectorOptions, type SelectorOptionType, type SelectorOptionData } from './options';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/shadcn/field';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxCollection,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxItem,
    ComboboxLabel,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor
} from '@/components/shadcn/combobox';

/** Connects the standard multi-value Combobox to repeated View form entries. */
export function MultiSelector(
    props: FieldProps & {
        options: SelectorOptionType[];
        value?: string[];
        defaultValue?: string[];
        onChange?: (value: string[]) => void;
        placeholder?: string;
        emptyText?: ReactNode;
    }
) {
    const id = useId();
    const anchor = useComboboxAnchor();
    const { ref, ...field } = useValue(props.value, props.defaultValue ?? [], props.onChange);
    const groups = selectorOptions(props.options).filter((group) => !group.divider);
    const items = groups.flatMap((group) => group.items);
    const selected = field.value.map((value) => items.find((item) => item.value === value) ?? { value });

    // Base UI owns multi-value interaction and repeated form entries.
    return (
        <Field ref={ref}>
            <FieldContent>
                <FieldLabel htmlFor={id}>
                    {props.label}
                    {props.required && <span className="text-muted-foreground">Required</span>}
                </FieldLabel>
                {props.description && <FieldDescription id={`${id}-description`}>{props.description}</FieldDescription>}
            </FieldContent>
            <Combobox<SelectorOptionData, true>
                name={props.name}
                required={props.required}
                itemToStringValue={(item) => item.value}
                multiple
                items={groups}
                value={selected}
                onValueChange={(values) => field.onChange(values.map((item) => item.value))}
                disabled={props.disabled}
                isItemEqualToValue={(item, value) => item.value === value.value}
                itemToStringLabel={(item) => item.label ?? item.value}
            >
                <ComboboxChips ref={anchor}>
                    <ComboboxValue>
                        {(values: SelectorOptionData[]) => (
                            <>
                                {values.map((item) => (
                                    <ComboboxChip key={item.value} aria-label={item.label ?? item.value}>
                                        {item.label ?? item.value}
                                    </ComboboxChip>
                                ))}
                                <ComboboxChipsInput
                                    id={id}
                                    placeholder={values.length ? undefined : (props.placeholder ?? 'Select...')}
                                    aria-describedby={props.description ? `${id}-description` : undefined}
                                    aria-required={props.required || undefined}
                                    disabled={props.disabled}
                                />
                            </>
                        )}
                    </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={anchor}>
                    <ComboboxEmpty>
                        {items.length === 0 ? (props.emptyText ?? 'No options') : 'No results found'}
                    </ComboboxEmpty>
                    <ComboboxList>
                        {(group: (typeof groups)[number]) => (
                            <ComboboxGroup key={group.id} items={group.items}>
                                {group.title && <ComboboxLabel>{group.title}</ComboboxLabel>}
                                <ComboboxCollection>
                                    {(item: SelectorOptionData) => (
                                        <ComboboxItem key={item.value} value={item} disabled={item.disabled}>
                                            {item.icon && <Icon icon={item.icon} size="sm" />}
                                            <span className="flex min-w-0 flex-col">
                                                <span>{item.label ?? item.value}</span>
                                                {item.description && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {item.description}
                                                    </span>
                                                )}
                                            </span>
                                        </ComboboxItem>
                                    )}
                                </ComboboxCollection>
                            </ComboboxGroup>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </Field>
    );
}

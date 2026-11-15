import { Icon } from './icon';
import { useId } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { useValue } from '@/components/custom/value';
import { FormField } from '@/components/custom/form-field';
import type { FieldProps } from '@/components/custom/types';
import { FieldContent, FieldDescription, FieldLabel } from '@/components/shadcn/field';
import { selectorOptions, type SelectorOptionType, type SelectorOptionData } from './options';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue
} from '@/components/shadcn/select';
import {
    Combobox,
    ComboboxCollection,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxInput,
    ComboboxItem,
    ComboboxLabel,
    ComboboxList
} from '@/components/shadcn/combobox';

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

/** Connects standard selection controls to View form submission and reset. */
export function Selector(props: SelectorProps) {
    const id = useId();
    const field = useValue<string | null>(props.value, props.defaultValue ?? null, props.onChange);
    const groups = selectorOptions(props.options);
    const items = groups.flatMap((group) => group.items);

    const selected =
        field.value === null ? null : (items.find((item) => item.value === field.value) ?? { value: field.value });

    // The form adapter remains the sole owner of submitted values.
    return (
        <FormField
            name={props.name}
            required={props.required}
            disabled={props.disabled}
            fieldRef={field.ref}
            values={[field.value ?? '']}
            serialize
        >
            <FieldContent>
                <FieldLabel htmlFor={id}>
                    {props.label}
                    {props.required && <span className="text-muted-foreground">Required</span>}
                </FieldLabel>
                {props.description && <FieldDescription id={`${id}-description`}>{props.description}</FieldDescription>}
            </FieldContent>
            {props.hasSearch ? (
                <Combobox<SelectorOptionData>
                    items={groups.filter((group) => !group.divider)}
                    value={selected}
                    onValueChange={(item) => field.onChange(item?.value ?? null)}
                    disabled={props.disabled}
                    isItemEqualToValue={(item, value) => item.value === value.value}
                    itemToStringLabel={(item) => item.label ?? item.value}
                >
                    <ComboboxInput
                        id={id}
                        placeholder={props.placeholder ?? 'Select...'}
                        aria-describedby={props.description ? `${id}-description` : undefined}
                        aria-required={props.required || undefined}
                        disabled={props.disabled}
                        showClear={props.hasClear ?? true}
                        className="w-full"
                    />
                    <ComboboxContent>
                        <ComboboxEmpty>No results found</ComboboxEmpty>
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
            ) : (
                <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={props.disabled}
                    items={items.map((item) => ({ value: item.value, label: item.label ?? item.value }))}
                >
                    <div className="flex min-w-0 items-center gap-1">
                        <SelectTrigger
                            id={id}
                            className="w-full min-w-0"
                            aria-describedby={props.description ? `${id}-description` : undefined}
                            aria-required={props.required || undefined}
                        >
                            <SelectValue placeholder={props.placeholder ?? 'Select...'} />
                        </SelectTrigger>
                        {(props.hasClear ?? true) && field.value !== null && !props.disabled && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Clear ${props.label}`}
                                onClick={() => field.onChange(null)}
                            >
                                <X aria-hidden="true" />
                            </Button>
                        )}
                    </div>
                    <SelectContent>
                        {groups.map((group) =>
                            group.divider ? (
                                <SelectSeparator key={group.id} />
                            ) : (
                                <SelectGroup key={group.id}>
                                    {group.title && <SelectLabel>{group.title}</SelectLabel>}
                                    {group.items.map((item) => (
                                        <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                                            {item.icon && <Icon icon={item.icon} size="sm" />}
                                            <span className="flex min-w-0 flex-col">
                                                <span>{item.label ?? item.value}</span>
                                                {item.description && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {item.description}
                                                    </span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )
                        )}
                    </SelectContent>
                </Select>
            )}
        </FormField>
    );
}

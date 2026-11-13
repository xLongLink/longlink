import { isString } from 'es-toolkit';
import { FieldLabel } from './FieldLabel';
import type { FieldProps } from './types';
import { Button } from '@base-ui/react/button';
import { Select } from '@base-ui/react/select';
import { Combobox } from '@base-ui/react/combobox';
import type { PickerOption, PickerOptionType } from './options';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Minus, Search, X } from 'lucide-react';

type PickerProps = Omit<FieldProps, 'name'> & {
    options: PickerOptionType[];
    placeholder?: string;
    emptyText?: ReactNode;
    hasSearch?: boolean;
    hasClear?: boolean;
    labelHidden?: boolean;
} & (
        | { multiple?: false; value: string | null; onChange: (value: string | null) => void }
        | {
              multiple: true;
              value: string[];
              onChange: (value: string[]) => void;
              triggerDisplay?: 'count' | 'labels' | 'badges';
              hasSelectAll?: boolean;
          }
    );

/** Shared trusted renderer; View adapters constrain icons and expose no render callbacks. */
export function Picker(props: PickerProps) {
    // Keep a stable selected-first ordering for the lifetime of an open multi picker.
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const control = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedAtOpen, setSelectedAtOpen] = useState<string[]>([]);
    const selected = props.multiple ? props.value : props.value === null ? [] : [props.value];
    const groups: { title?: string; divider?: boolean; items: PickerOption[] }[] = [];
    let pending: PickerOption[] = [];

    // Preserve section and divider boundaries, including independent selected-first runs.
    for (const option of props.options) {
        if (!isString(option) && 'type' in option) {
            if (pending.length) groups.push({ items: pending });
            pending = [];
            groups.push(
                option.type === 'divider'
                    ? { divider: true, items: [] }
                    : { title: option.title, items: option.options }
            );
        } else pending.push(isString(option) ? { value: option } : option);
    }

    if (pending.length) groups.push({ items: pending });
    const items = groups.flatMap((group) => group.items);
    const labels = selected.map((value) => items.find((item) => item.value === value)?.label ?? value);
    const selectedItem = !props.multiple ? items.find((item) => item.value === props.value) : undefined;

    const filteredGroups = groups.map((group) => {
        const visible = group.items.filter((item) =>
            (item.label ?? item.value).toLowerCase().includes(query.toLowerCase())
        );

        const order = open ? selectedAtOpen : selected;

        return {
            ...group,
            items: props.multiple
                ? [
                      ...visible.filter((item) => order.includes(item.value)),
                      ...visible.filter((item) => !order.includes(item.value)),
                  ]
                : visible,
        };
    });

    const visibleItems = filteredGroups.flatMap((group) => group.items);
    const enabled = visibleItems.filter((item) => !item.disabled);
    const allSelected = enabled.length > 0 && enabled.every((item) => selected.includes(item.value));
    const someSelected = enabled.some((item) => selected.includes(item.value));
    let selectAllValue = `${id}-all`;

    while (items.some((item) => item.value === selectAllValue) || selected.includes(selectAllValue))
        selectAllValue += '-';
    const hasSelectAll = props.multiple && props.hasSelectAll && visibleItems.length > 0;
    const P = props.hasSearch ? Combobox : Select;

    // Portalled rows must still honor a field disabled after the panel opened.
    const blocked = () => props.disabled || trigger.current?.matches(':disabled');

    const change = (value: string | string[] | null) => {
        if (blocked()) return;

        if (!props.multiple) {
            if (!Array.isArray(value)) props.onChange(value);

            return;
        }

        if (!Array.isArray(value)) return;

        if (!value.includes(selectAllValue)) {
            props.onChange(value);

            return;
        }

        const enabledValues = new Set(enabled.map((item) => item.value));
        props.onChange(
            allSelected
                ? props.value.filter((entry) => !enabledValues.has(entry))
                : [...props.value, ...enabled.flatMap((item) => (props.value.includes(item.value) ? [] : [item.value]))]
        );
    };

    const changeOpen = (next: boolean) => {
        if (blocked() && next) return;

        if (next) setSelectedAtOpen(selected);
        else setQuery('');
        setOpen(next);
    };

    // A parent can disable an open field without an interactive close request.
    const finishOpenChange = (next: boolean) => {
        if (next) return;
        setOpen(false);
        setQuery('');
    };

    // Both primitives share presentation, but only the combobox renders an input.
    const row = (item: PickerOption) => (
        <P.Item key={item.value} value={item.value} disabled={item.disabled} className="view-picker-option">
            <span className="view-picker-option-content">
                {item.icon && (
                    <span className="view-picker-option-icon" aria-hidden="true">
                        {item.icon}
                    </span>
                )}
                <span className="view-picker-option-copy">
                    {props.hasSearch ? (
                        <span>{item.label ?? item.value}</span>
                    ) : (
                        <Select.ItemText render={<span />}>{item.label ?? item.value}</Select.ItemText>
                    )}
                    {item.description && <span className="view-picker-option-description">{item.description}</span>}
                </span>
            </span>
            {props.multiple ? (
                <span
                    className="view-picker-check"
                    data-checked={selected.includes(item.value) || undefined}
                    aria-hidden="true"
                >
                    {selected.includes(item.value) && <Check />}
                </span>
            ) : (
                <P.ItemIndicator className="view-picker-mark">
                    <Check />
                </P.ItemIndicator>
            )}
        </P.Item>
    );

    const contents = (
        <div
            className="view-text-field view-picker"
            data-multiple={props.multiple || undefined}
            data-disabled={props.disabled || undefined}
        >
            <div className={props.labelHidden ? 'view-picker-hidden-label' : undefined}>
                <FieldLabel
                    controlId={id}
                    label={props.label}
                    description={props.description}
                    required={props.required}
                />
            </div>
            <div ref={control} className="view-picker-control">
                <P.Trigger
                    ref={trigger}
                    id={id}
                    className="view-picker-trigger"
                    aria-labelledby={`${id}-label ${id}-value`}
                    aria-describedby={props.description ? `${id}-description` : undefined}
                    aria-required={props.required || undefined}
                    aria-disabled={props.disabled || undefined}
                >
                    <span
                        id={`${id}-value`}
                        className="view-picker-value"
                        data-placeholder={(props.multiple ? selected.length === 0 : !selectedItem) || undefined}
                    >
                        {selected.length === 0 ? (
                            <span>{props.placeholder ?? 'Select...'}</span>
                        ) : props.multiple ? (
                            props.triggerDisplay === 'badges' ? (
                                <span className="view-picker-badges">
                                    {labels.slice(0, 3).map((label, index) => (
                                        <span className="view-picker-badge" key={selected[index]}>
                                            {label}
                                        </span>
                                    ))}
                                    {labels.length > 3 && (
                                        <span className="view-picker-overflow">+{labels.length - 3}</span>
                                    )}
                                </span>
                            ) : props.triggerDisplay === 'labels' ? (
                                <span>{`${labels.slice(0, 3).join(', ')}${labels.length > 3 ? `, +${labels.length - 3}` : ''}`}</span>
                            ) : (
                                <span>{selected.length} selected</span>
                            )
                        ) : (
                            <>
                                {selectedItem?.icon && (
                                    <span className="view-picker-option-icon" aria-hidden="true">
                                        {selectedItem.icon}
                                    </span>
                                )}
                                <span>
                                    {selectedItem
                                        ? (selectedItem.label ?? selectedItem.value)
                                        : (props.placeholder ?? 'Select...')}
                                </span>
                            </>
                        )}
                    </span>
                    <ChevronDown className="view-picker-chevron" aria-hidden="true" />
                </P.Trigger>
                {props.hasClear && selected.length > 0 && !props.disabled && (
                    <Button
                        type="button"
                        className="view-picker-clear"
                        aria-label={`Clear ${props.label}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            change(props.multiple ? [] : null);
                            trigger.current?.focus({ preventScroll: true });
                        }}
                    >
                        <X aria-hidden="true" />
                    </Button>
                )}
            </div>
            <P.Portal>
                <P.Positioner
                    className="view-picker-positioner"
                    anchor={control}
                    align="start"
                    sideOffset={props.multiple || props.hasSearch ? 4 : 0}
                    {...(!props.hasSearch ? { alignItemWithTrigger: !props.multiple } : {})}
                >
                    <P.Popup
                        className="view-picker-popup"
                        aria-label={props.label}
                        data-multiple={props.multiple || undefined}
                    >
                        {props.hasSearch && (
                            <div className="view-picker-search">
                                <div className="view-picker-search-field">
                                    <Search aria-hidden="true" />
                                    <Combobox.Input
                                        ref={search}
                                        className="view-picker-search-input"
                                        aria-label={`Search ${props.label}`}
                                        placeholder="Search..."
                                    />
                                    {query && (
                                        <Button
                                            type="button"
                                            className="view-picker-search-clear"
                                            aria-label="Clear search"
                                            onClick={() => {
                                                setQuery('');
                                                search.current?.focus();
                                            }}
                                        >
                                            <X aria-hidden="true" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                        {visibleItems.length === 0 && (
                            <div className="view-picker-empty" role="status">
                                {query ? 'No results found' : (props.emptyText ?? 'No options')}
                            </div>
                        )}
                        <P.List className="view-picker-list">
                            {hasSelectAll && (
                                <P.Item
                                    value={selectAllValue}
                                    className="view-picker-option view-picker-select-all"
                                    disabled={enabled.length === 0}
                                    aria-selected={allSelected}
                                    aria-label={
                                        someSelected && !allSelected ? 'Select all, partially selected' : undefined
                                    }
                                >
                                    <span>Select all</span>
                                    <span
                                        className="view-picker-check"
                                        data-checked={allSelected || someSelected || undefined}
                                        aria-hidden="true"
                                    >
                                        {allSelected ? <Check /> : someSelected ? <Minus /> : null}
                                    </span>
                                </P.Item>
                            )}
                            {filteredGroups.map((group, index) =>
                                group.divider ? (
                                    !query && (
                                        // eslint-disable-next-line react/no-array-index-key -- Separators retain their source positions.
                                        <P.Separator key={index} className="view-picker-divider" aria-hidden="true" />
                                    )
                                ) : group.items.length > 0 ? (
                                    // eslint-disable-next-line react/no-array-index-key -- Group titles need not be unique.
                                    <P.Group key={index}>
                                        {group.title && (
                                            <P.GroupLabel className="view-picker-group-label">
                                                {group.title}
                                            </P.GroupLabel>
                                        )}
                                        {group.items.map(row)}
                                    </P.Group>
                                ) : null
                            )}
                        </P.List>
                    </P.Popup>
                </P.Positioner>
            </P.Portal>
        </div>
    );

    if (props.hasSearch)
        return (
            <Combobox.Root<string, boolean>
                multiple={props.multiple ?? false}
                value={props.value}
                onValueChange={change}
                readOnly={props.disabled}
                open={open && !props.disabled}
                onOpenChange={changeOpen}
                onOpenChangeComplete={finishOpenChange}
                inputValue={query}
                onInputValueChange={(value, details) => {
                    if (!details.isItemPress) setQuery(value);
                }}
                filter={null}
                items={items.map((item) => item.value)}
                filteredItems={[...(hasSelectAll ? [selectAllValue] : []), ...visibleItems.map((item) => item.value)]}
                itemToStringLabel={(value) => items.find((item) => item.value === value)?.label ?? value}
            >
                {contents}
            </Combobox.Root>
        );

    return (
        <Select.Root<string, boolean>
            multiple={props.multiple ?? false}
            value={props.value}
            onValueChange={change}
            readOnly={props.disabled}
            open={open && !props.disabled}
            onOpenChange={changeOpen}
            onOpenChangeComplete={finishOpenChange}
            modal={false}
            items={items.map((item) => ({ value: item.value, label: item.label ?? item.value }))}
        >
            {contents}
        </Select.Root>
    );
}

import { isString } from 'es-toolkit';
import type { ReactNode } from 'react';
import type { IconName } from 'lucide-react/dynamic';

export type SelectorOptionData = {
    value: string;
    label?: string;
    description?: ReactNode;
    icon?: IconName;
    disabled?: boolean;
};

export type SelectorOptionType =
    | string
    | SelectorOptionData
    | { type: 'divider' }
    | { type: 'section'; title?: string; options: SelectorOptionData[] };

/** Normalizes View options into the grouped collection used by Select and Combobox. */
export function selectorOptions(options: SelectorOptionType[]) {
    const groups: { title?: string; divider?: boolean; items: SelectorOptionData[] }[] = [];
    let items: SelectorOptionData[] = [];

    // Preserve source order and explicit section boundaries.
    for (const option of options) {
        if (!isString(option) && 'type' in option) {
            if (items.length) groups.push({ items });
            items = [];
            groups.push(
                option.type === 'divider'
                    ? { divider: true, items: [] }
                    : { title: option.title, items: option.options }
            );
        } else items.push(isString(option) ? { value: option } : option);
    }

    if (items.length) groups.push({ items });

    return groups.map((group, id) => ({ ...group, id }));
}

import { isString } from 'es-toolkit';
import type { ReactNode } from 'react';
import { Icon, type StoneIconName } from './Icon';

export type SelectorOptionData = {
    value: string;
    label?: string;
    description?: ReactNode;
    icon?: StoneIconName;
    disabled?: boolean;
};

export type SelectorOptionType =
    | string
    | SelectorOptionData
    | { type: 'divider' }
    | { type: 'section'; title?: string; options: SelectorOptionData[] };

export type PickerOption = Omit<SelectorOptionData, 'icon'> & { icon?: ReactNode };

export type PickerOptionType =
    | string
    | PickerOption
    | { type: 'divider' }
    | { type: 'section'; title?: string; options: PickerOption[] };

/** Adapts LongLink icon names for both single and multiple option pickers. */
export function selectorOptions(options: SelectorOptionType[]): PickerOptionType[] {
    return options.map((option) => {
        // Preserve plain labels and dividers without adding a glyph.
        if (isString(option) || ('type' in option && option.type === 'divider')) return option;

        // Adapt section glyphs through the same immediate-or-deferred LongLink renderer.
        if ('type' in option)
            return {
                ...option,
                options: option.options.map((entry) => ({
                    ...entry,
                    icon: entry.icon ? <Icon icon={entry.icon} size="sm" /> : undefined,
                })),
            };

        // Keep selected values and menu rows on the same icon-loading path.
        return { ...option, icon: option.icon ? <Icon icon={option.icon} size="sm" /> : undefined };
    });
}

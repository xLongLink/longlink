import type { FieldProps } from './types';
import type { SelectorOptionType } from './Selector';
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
    return <AstryxMultiSelector {...props} changeAction={undefined} isLoading={false} />;
}

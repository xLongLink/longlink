import type { FieldProps } from './types';
import {
    PowerSearch as AstryxPowerSearch,
    type PowerSearchConfig,
    type PowerSearchFilter,
} from '@astryxdesign/core/PowerSearch';

/** Edits structured filters without exposing token-editor sizing and presentation controls. */
export function PowerSearch(props: {
    config: PowerSearchConfig;
    filters: readonly PowerSearchFilter[];
    onChange: (filters: readonly PowerSearchFilter[], changeType: 'add' | 'edit' | 'remove', index: number) => void;
    label?: string;
    isLabelHidden?: boolean;
    placeholder?: string;
    hasClear?: boolean;
    isReadOnly?: boolean;
    isDisabled?: boolean;
    status?: FieldProps['status'];
    resultCount?: number | string;
    timezoneID?: string;
}) {
    return <AstryxPowerSearch {...props} />;
}

import type { FieldProps } from './types';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';

/** Edits an on/off setting using one controlled change handler. */
export function Switch(
    props: FieldProps & { value: boolean; onChange?: (value: boolean) => void; htmlName?: string; size?: 'sm' | 'md' }
) {
    return <AstryxSwitch {...props} changeAction={undefined} isLoading={false} />;
}

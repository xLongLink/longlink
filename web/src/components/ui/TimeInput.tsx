import type { FieldProps } from './types';
import { TimeInput as AstryxTimeInput, type ISOTimeString } from '@astryxdesign/core/TimeInput';

/** Selects a constrained time using the standard picker. */
export function TimeInput(
    props: FieldProps & {
        value?: ISOTimeString;
        onChange?: (value: ISOTimeString | undefined) => void;
        min?: ISOTimeString;
        max?: ISOTimeString;
        hasSeconds?: boolean;
        hasClear?: boolean;
        hourFormat?: '12h' | '24h';
        increment?: number;
        placeholder?: string;
        size?: 'sm' | 'md' | 'lg';
    }
) {
    return <AstryxTimeInput {...props} changeAction={undefined} isLoading={false} />;
}

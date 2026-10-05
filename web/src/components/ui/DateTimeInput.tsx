import type { FieldProps } from './types';
import { DateTimeInput as AstryxDateTimeInput, type ISODateTimeString } from '@astryxdesign/core/DateTimeInput';

/** Selects a constrained date and time without custom picker presentation. */
export function DateTimeInput(
    props: FieldProps & {
        value?: ISODateTimeString;
        onChange: (value: ISODateTimeString | undefined) => void;
        min?: ISODateTimeString;
        max?: ISODateTimeString;
        placeholder?: string;
        hasClear?: boolean;
        hasSeconds?: boolean;
        hourFormat?: '12h' | '24h';
        size?: 'sm' | 'md' | 'lg';
    }
) {
    return <AstryxDateTimeInput {...props} changeAction={undefined} isLoading={false} />;
}

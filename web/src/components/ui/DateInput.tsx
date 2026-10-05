import type { FieldProps } from './types';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { DateInput as AstryxDateInput } from '@astryxdesign/core/DateInput';

/** Selects a constrained date with standard month and week presentation. */
export function DateInput(
    props: FieldProps & {
        value?: ISODateString;
        onChange?: (value: ISODateString | undefined) => void;
        min?: ISODateString;
        max?: ISODateString;
        dateConstraints?: readonly ((date: Date) => boolean)[];
        placeholder?: string;
        hasClear?: boolean;
        size?: 'sm' | 'md' | 'lg';
    }
) {
    return (
        <AstryxDateInput {...props} numberOfMonths={1} weekStartsOn="sun" changeAction={undefined} isLoading={false} />
    );
}

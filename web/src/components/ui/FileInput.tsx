import type { FieldProps } from './types';
import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';

/** Selects files with explicit upload constraints; uploading remains a Solution operation. */
export function FileInput(
    props: FieldProps & {
        value: File | File[] | null;
        onChange: (value: File | File[] | null) => void;
        accept?: string;
        isMultiple?: boolean;
        maxSize?: number;
        maxFiles?: number;
        placeholder?: string;
        mode?: 'input' | 'dropzone';
    }
) {
    // Default to a single-file field without imposing arbitrary file-size or format limits.
    return (
        <AstryxFileInput
            {...props}
            isMultiple={props.isMultiple ?? false}
            mode={props.mode ?? 'input'}
            placeholder={props.placeholder ?? (props.isMultiple ? 'Choose files' : 'Choose file')}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}

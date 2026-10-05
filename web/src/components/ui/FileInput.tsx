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
    return <AstryxFileInput {...props} changeAction={undefined} isLoading={false} />;
}

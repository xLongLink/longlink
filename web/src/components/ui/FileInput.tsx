import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';

/** Selects files with explicit upload constraints; uploading remains a Solution operation. */
export function FileInput(
    props: FieldProps & {
        value?: File | File[] | null;
        onChange?: (value: File | File[] | null) => void;
        accept?: string;
        isMultiple?: boolean;
        multiple?: boolean;
        maxSize?: number;
        maxFiles?: number;
        placeholder?: string;
        mode?: 'input' | 'dropzone';
    }
) {
    // Serialize selected or dropped File objects rather than the picker's transient FileList.
    const { name, required, ...control } = props;
    const field = useValue(props.value, null, props.onChange);
    const files = field.value === null ? [] : Array.isArray(field.value) ? field.value : [field.value];
    const multiple = props.multiple ?? props.isMultiple ?? false;

    // Default to a single-file field without imposing arbitrary file-size or format limits.
    return (
        <FormField {...control} name={name} required={required} fieldRef={field.ref} values={files} serialize>
            <AstryxFileInput
                {...control}
                value={field.value}
                onChange={field.onChange}
                isMultiple={multiple}
                mode={props.mode ?? 'input'}
                placeholder={props.placeholder ?? (multiple ? 'Choose files' : 'Choose file')}
                isLabelHidden={false}
                isRequired={required ?? props.isRequired ?? false}
                isDisabled={(props.disabled ?? props.isDisabled ?? false) || props.readOnly}
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}

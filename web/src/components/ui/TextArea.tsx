import type { FieldProps } from './types';
import { TextArea as AstryxTextArea } from '@astryxdesign/core/TextArea';

type TextAreaProps = FieldProps & {
    value: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    rows?: number;
    maxLength?: number;
    isReadOnly?: boolean;
    hasSpellCheck?: boolean;
    hasAutoFocus?: boolean;
    htmlName?: string;
    autoComplete?: string;
};

/** Edits controlled multi-line text using standard field presentation. */
export function TextArea(props: TextAreaProps) {
    // Default to three editable rows with spell checking and no focus stealing.
    return (
        <AstryxTextArea
            {...props}
            rows={props.rows ?? 3}
            isReadOnly={props.isReadOnly ?? false}
            hasSpellCheck={props.hasSpellCheck ?? true}
            hasAutoFocus={props.hasAutoFocus ?? false}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}

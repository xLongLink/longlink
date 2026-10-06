import type { FieldProps } from './types';
import { TextArea as AstryxTextArea } from '@astryxdesign/core/TextArea';

type TextAreaProps = FieldProps & {
    value: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    rows?: number;
    maxLength?: number;
    isReadOnly?: boolean;
    hasAutoFocus?: boolean;
    htmlName?: string;
    autoComplete?: string;
};

/** Edits controlled multi-line text using standard field presentation. */
export function TextArea(props: TextAreaProps) {
    // Always enable spell checking and default to three editable rows with no focus stealing.
    return (
        <AstryxTextArea
            {...props}
            rows={props.rows ?? 3}
            isReadOnly={props.isReadOnly ?? false}
            hasSpellCheck
            hasAutoFocus={props.hasAutoFocus ?? false}
            isLabelHidden={false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}

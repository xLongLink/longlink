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
    return <AstryxTextArea {...props} changeAction={undefined} isLoading={false} />;
}

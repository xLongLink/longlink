import { Label } from '@/ui/label';
import { Textarea as UITextarea } from '@/ui/textarea';
import type { XmlComponentProps } from '@/xml';

type TextareaProps = {
    label?: string;
    description?: string;
    name?: string;
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
};

/** Renders an XML textarea control from evaluated XML props. */
export function Textarea({ props }: XmlComponentProps) {
    const { label, description, ...textareaProps } = props as TextareaProps;
    return (
        <div className="space-y-2">
            {label ? <Label>{label}</Label> : null}
            <UITextarea
                {...textareaProps}
                onChange={(event) => {
                    textareaProps.onChange?.(event.currentTarget.value);
                }}
            />
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}

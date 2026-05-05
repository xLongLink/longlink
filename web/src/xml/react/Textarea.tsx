import { Label } from '@/ui/label';
import { Textarea as UITextarea } from '@/ui/textarea';

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

export function Textarea({ label, description, ...props }: TextareaProps) {
    return (
        <div className="space-y-2">
            {label ? <Label>{label}</Label> : null}
            <UITextarea
                {...props}
                onChange={(event) => {
                    props.onChange?.(event.currentTarget.value);
                }}
            />
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}

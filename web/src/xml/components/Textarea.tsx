import { Label } from '@/ui/label';
import { Textarea as UITextarea } from '@/ui/textarea';
import type { ComponentProps } from 'react';

type TextareaProps = ComponentProps<typeof UITextarea> & {
    label?: string;
    description?: string;
};

/** Renders a textarea input with label and description. */
export function Textarea({ label, description, ...props }: TextareaProps) {
    return (
        <div className="space-y-2">
            {label ? <Label>{label}</Label> : null}

            <UITextarea {...props} />

            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}

export default Textarea;

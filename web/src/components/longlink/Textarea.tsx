import { Label } from '@/components/ui/label';
import { Textarea as UITextarea } from '@/components/ui/textarea';

type TextareaProps = {
    label?: string;
    placeholder?: string;
    description?: string;
};

export function Textarea({ label, placeholder, description }: TextareaProps) {
    return (
        <div className="space-y-2">
            {label ? <Label>{label}</Label> : null}

            <UITextarea placeholder={placeholder} />

            {description ? (
                <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
        </div>
    );
}

export default Textarea;

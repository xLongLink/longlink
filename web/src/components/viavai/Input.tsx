import { Button } from '@/components/ui/button';
import { Input as UIInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type InputProps = {
    label?: string;
    placeholder?: string;
    description?: string;
    submit?: string;
};

export function Input({ label, placeholder, description, submit }: InputProps) {
    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}

            <div className="flex items-center gap-2">
                <UIInput placeholder={placeholder} />
                {submit && (
                    <Button type="button" className="cursor-pointer">
                        {submit}
                    </Button>
                )}
            </div>

            {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
            )}
        </div>
    );
}

export default Input;

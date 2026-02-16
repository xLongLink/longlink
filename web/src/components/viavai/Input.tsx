import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
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

            <ButtonGroup className="w-full">
                <UIInput placeholder={placeholder} />
                {submit && (
                    <Button type="button" className="cursor-pointer">
                        {submit}
                    </Button>
                )}
            </ButtonGroup>

            {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
            )}
        </div>
    );
}

export default Input;

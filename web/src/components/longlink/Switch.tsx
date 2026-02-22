import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Switch as UISwitch } from '@/components/ui/switch';

type SwitchProps = {
    label?: string;
    description?: string;
    active?: boolean;
};

export function Switch({ label, description, active = false }: SwitchProps) {
    const id = useId();

    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
                {label ? <Label htmlFor={id}>{label}</Label> : null}
                {description ? (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                ) : null}
            </div>

            <UISwitch id={id} defaultChecked={active} />
        </div>
    );
}

export default Switch;

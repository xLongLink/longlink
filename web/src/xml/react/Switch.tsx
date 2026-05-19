import { Switch as UISwitch } from '@/components/ui/switch';

/** Props accepted by the XML Switch component. */
export interface SwitchProps {
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    id?: string;
    onCheckedChange?: (checked: boolean) => void;
    size?: 'sm' | 'default';
}

/** Renders a shadcn-backed switch. */
export function Switch({ checked, defaultChecked, disabled, id, onCheckedChange, size = 'default' }: SwitchProps) {
    if (checked !== undefined) {
        return (
            <UISwitch
                checked={checked}
                disabled={disabled}
                id={id}
                onCheckedChange={onCheckedChange}
                size={size}
            />
        );
    }

    return <UISwitch defaultChecked={defaultChecked} disabled={disabled} id={id} size={size} />;
}

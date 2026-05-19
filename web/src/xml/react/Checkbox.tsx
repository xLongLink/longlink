import { Checkbox as UICheckbox } from '@/components/ui/checkbox';

/** Props accepted by the XML Checkbox component. */
export interface CheckboxProps {
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    id?: string;
    onCheckedChange?: (checked: boolean) => void;
}

/** Renders a shadcn-backed checkbox. */
export function Checkbox({ checked, defaultChecked, disabled, id, onCheckedChange }: CheckboxProps) {
    if (checked !== undefined) {
        return (
            <UICheckbox
                checked={checked}
                disabled={disabled}
                id={id}
                onCheckedChange={(nextChecked) => {
                    onCheckedChange?.(nextChecked === true);
                }}
            />
        );
    }

    return <UICheckbox defaultChecked={defaultChecked} disabled={disabled} id={id} />;
}

import { Checkbox as UICheckbox } from '@/components/ui/checkbox';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML Checkbox component. */
export interface CheckboxProps {
    checked?: boolean | Record<string, unknown>;
    className?: string;
    defaultChecked?: boolean;
    disabled?: boolean;
    id?: string;
}

/** Renders a shadcn-backed checkbox with optional reactive state binding. */
export function Checkbox({ checked, className, defaultChecked, disabled, id }: CheckboxProps) {
    if (checked && typeof checked === 'object' && getVersion(checked) !== undefined) {
        const state = checked as Record<string, unknown> & { value?: unknown };
        const snapshot = useSnapshot(state);
        const currentChecked = 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UICheckbox
                checked={Boolean(currentChecked)}
                className={className}
                disabled={disabled}
                id={id}
                onCheckedChange={(nextChecked) => {
                    if ('value' in state) {
                        state.value = nextChecked === true;
                    }
                }}
            />
        );
    }

    return <UICheckbox className={className} defaultChecked={defaultChecked} disabled={disabled} id={id} />;
}

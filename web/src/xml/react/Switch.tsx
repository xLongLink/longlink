import { Switch as UISwitch } from '@/components/ui/switch';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML Switch component. */
export interface SwitchProps {
    checked?: boolean | Record<string, unknown>;
    defaultChecked?: boolean;
    disabled?: boolean;
    id?: string;
    size?: 'sm' | 'default';
}

/** Renders a shadcn-backed switch with optional reactive state binding. */
export function Switch({ checked, defaultChecked, disabled, id, size = 'default' }: SwitchProps) {
    if (checked && typeof checked === 'object' && getVersion(checked) !== undefined) {
        const state = checked as Record<string, unknown> & { value?: unknown };
        const snapshot = useSnapshot(state);
        const currentChecked = 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UISwitch
                checked={Boolean(currentChecked)}
                disabled={disabled}
                id={id}
                onCheckedChange={(nextChecked) => {
                    if ('value' in state) {
                        state.value = nextChecked;
                    }
                }}
                size={size}
            />
        );
    }

    return <UISwitch defaultChecked={defaultChecked} disabled={disabled} id={id} size={size} />;
}

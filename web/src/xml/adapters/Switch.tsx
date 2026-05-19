import { Switch as UISwitch } from '@/components/ui/switch';
import type { Props } from '@xml';
import { useXmlContext } from '@xml';
import { useSnapshot } from 'valtio';
import { isXmlValueState, resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Props accepted by the XML Switch component. */
export interface SwitchProps extends Props {}

/** Renders a shadcn-backed switch. */
export function Switch({ props, nodes }: SwitchProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const checked = resolveXmlValue(props, 'checked', ctx);
    const defaultChecked = resolveXmlBoolean(props, 'defaultChecked', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const size = resolveXmlString(props, 'size', ctx, 'default');
    if (isXmlValueState(checked)) {
        const snapshot = useSnapshot(checked);

        return (
            <UISwitch
                checked={Boolean('value' in snapshot ? snapshot.value : snapshot)}
                disabled={disabled}
                id={id}
                onCheckedChange={(nextChecked) => {
                    if ('value' in checked) checked.value = nextChecked;
                }}
                size={size}
            />
        );
    }

    if (checked !== undefined) {
        return (
            <UISwitch checked={Boolean(checked)} disabled={disabled} id={id} onCheckedChange={() => {}} size={size} />
        );
    }

    return <UISwitch defaultChecked={defaultChecked} disabled={disabled} id={id} size={size} />;
}

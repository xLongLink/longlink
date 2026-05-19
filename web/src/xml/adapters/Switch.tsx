import { Switch as UISwitch } from '@/components/ui/switch';
import { useSnapshot } from 'valtio';
import { useXmlContext } from '@xml/core/context';
import type { Props } from '@xml/types';
import { isXmlValueState, resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Props accepted by the XML Switch component. */

/** Renders a shadcn-backed switch. */
export function Switch({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
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

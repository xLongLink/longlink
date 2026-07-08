import { Switch as UISwitch } from '@/components/ui/switch';
import { useXmlContext } from '@/xml/core/context';
import type { Props } from '@/xml/types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue, useXmlValueSnapshot } from './props';

/** Renders a shadcn-backed switch. */
export function Switch({ props }: Props) {
    const { ctx } = useXmlContext();
    const checked = resolveXmlValue(props, 'checked', ctx);
    const defaultChecked = resolveXmlBoolean(props, 'defaultChecked', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const { state, snapshot } = useXmlValueSnapshot(checked);

    if (state) {
        const currentValue =
            snapshot && typeof snapshot === 'object' && 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UISwitch
                checked={Boolean(currentValue)}
                disabled={disabled}
                id={id}
                onCheckedChange={(nextChecked) => {
                    if ('value' in state) state.value = nextChecked;
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

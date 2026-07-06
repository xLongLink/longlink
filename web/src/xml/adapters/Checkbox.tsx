import { Checkbox as UICheckbox } from '@/components/ui/checkbox';
import { useXmlContext } from '@/xml/core/context';
import type { Props } from '@/xml/types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue, useXmlValueSnapshot } from './props';

/** Props accepted by the XML Checkbox component. */

/** Renders a shadcn-backed checkbox. */
export function Checkbox({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const checked = resolveXmlValue(props, 'checked', ctx);
    const defaultChecked = resolveXmlBoolean(props, 'defaultChecked', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const { state, snapshot } = useXmlValueSnapshot(checked);

    if (state) {
        const currentValue =
            snapshot && typeof snapshot === 'object' && 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UICheckbox
                checked={Boolean(currentValue)}
                disabled={disabled}
                id={id}
                onCheckedChange={(nextChecked) => {
                    if ('value' in state) state.value = nextChecked;
                }}
            />
        );
    }

    if (checked !== undefined) {
        return <UICheckbox checked={Boolean(checked)} disabled={disabled} id={id} onCheckedChange={() => {}} />;
    }

    return <UICheckbox defaultChecked={defaultChecked} disabled={disabled} id={id} />;
}

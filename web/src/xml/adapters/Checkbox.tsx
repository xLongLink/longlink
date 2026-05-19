import { Checkbox as UICheckbox } from '@/components/ui/checkbox';
import { useSnapshot } from 'valtio';
import { useXmlContext } from '@xml/core/context';
import type { Props } from '@xml/types';
import { isXmlValueState, resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Props accepted by the XML Checkbox component. */

/** Renders a shadcn-backed checkbox. */
export function Checkbox({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const checked = resolveXmlValue(props, 'checked', ctx);
    const defaultChecked = resolveXmlBoolean(props, 'defaultChecked', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    if (isXmlValueState(checked)) {
        const snapshot = useSnapshot(checked);

        return (
            <UICheckbox
                checked={Boolean('value' in snapshot ? snapshot.value : snapshot)}
                disabled={disabled}
                id={id}
                onCheckedChange={(nextChecked) => {
                    if ('value' in checked) checked.value = nextChecked;
                }}
            />
        );
    }

    if (checked !== undefined) {
        return <UICheckbox checked={Boolean(checked)} disabled={disabled} id={id} onCheckedChange={() => {}} />;
    }

    return <UICheckbox defaultChecked={defaultChecked} disabled={disabled} id={id} />;
}

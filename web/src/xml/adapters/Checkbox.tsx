import type { Props } from '@/xml/types';
import { useXmlContext } from '@/xml/core/context';
import { Checkbox as UICheckbox } from '@/components/ui/checkbox';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue, useXmlValueSnapshot } from './props';

/** Renders a shadcn-backed checkbox. */
export function Checkbox({ props }: Props) {
    const { ctx } = useXmlContext();
    const checked = resolveXmlValue(props, 'checked', ctx);
    const defaultChecked = resolveXmlBoolean(props, 'defaultChecked', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const { state, snapshot } = useXmlValueSnapshot(checked);

    // Render bound checkboxes as controlled inputs.
    if (state) {
        const currentValue =
            snapshot && typeof snapshot === 'object' && 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UICheckbox
                checked={Boolean(currentValue)}
                disabled={disabled}
                id={id}
                onCheckedChange={(nextChecked) => {
                    // Write checked changes back to the bound state.
                    if ('value' in state) state.value = nextChecked;
                }}
            />
        );
    }

    // Render explicit checked values as controlled inputs.
    if (checked !== undefined) {
        return <UICheckbox checked={Boolean(checked)} disabled={disabled} id={id} onCheckedChange={() => {}} />;
    }

    return <UICheckbox defaultChecked={defaultChecked} disabled={disabled} id={id} />;
}

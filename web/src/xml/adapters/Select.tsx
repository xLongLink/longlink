import {
    Select as UISelect,
    SelectContent as UISelectContent,
    SelectGroup as UISelectGroup,
    SelectItem as UISelectItem,
    SelectLabel as UISelectLabel,
    SelectSeparator as UISelectSeparator,
    SelectTrigger as UISelectTrigger,
    SelectValue as UISelectValue,
} from '@/components/ui/select';
import { getVersion, useSnapshot } from 'valtio';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Renders a shadcn-backed select shell with optional reactive value binding. */
export function Select({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const defaultOpen = resolveXmlBoolean(props, 'defaultOpen', ctx);
    const defaultValue = resolveXmlString(props, 'defaultValue', ctx);
    const open = resolveXmlBoolean(props, 'open', ctx);
    const value = resolveXmlValue(props, 'value', ctx);

    // Bind directly to Valtio-backed state slots so selects stay in sync with XML state.
    if (value && typeof value === 'object' && getVersion(value) !== undefined) {
        const state = value as Record<string, unknown> & { value?: unknown };
        const snapshot = useSnapshot(state);
        const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UISelect
                defaultOpen={defaultOpen}
                open={open}
                value={currentValue == null ? undefined : String(currentValue)}
                onValueChange={(nextValue) => {
                    if ('value' in state) {
                        state.value = nextValue;
                    }
                }}
            >
                {renderNode(children ?? [], ctx)}
            </UISelect>
        );
    }

    const initialValue = value != null ? String(value) : defaultValue;

    return (
        <UISelect defaultOpen={defaultOpen} defaultValue={initialValue} open={open}>
            {renderNode(children ?? [], ctx)}
        </UISelect>
    );
}

/** Renders the select trigger slot. */
export function SelectTrigger({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UISelectTrigger>{renderNode(children ?? [], ctx)}</UISelectTrigger>;
}

/** Renders the selected value placeholder or active choice. */
export function SelectValue({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const placeholder = resolveXmlString(props, 'placeholder', ctx);
    return <UISelectValue placeholder={placeholder} />;
}

/** Renders the select content portal and list surface. */
export function SelectContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UISelectContent>{renderNode(children ?? [], ctx)}</UISelectContent>;
}

/** Renders a grouped section inside the select menu. */
export function SelectGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UISelectGroup>{renderNode(children ?? [], ctx)}</UISelectGroup>;
}

/** Renders the label for a grouped select section. */
export function SelectLabel({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UISelectLabel>{renderNode(children ?? [], ctx)}</UISelectLabel>;
}

/** Renders a selectable option in the menu. */
export function SelectItem({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const value = resolveXmlString(props, 'value', ctx);

    if (!value) throw new Error('SelectItem requires a value');

    return <UISelectItem value={value}>{renderNode(children ?? [], ctx)}</UISelectItem>;
}

/** Renders a visual separator between select groups. */
export function SelectSeparator() {
    return <UISelectSeparator />;
}

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
import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { requireXmlString, resolveXmlBoolean, resolveXmlString, resolveXmlValue, useXmlValueSnapshot } from './props';

/** Renders a shadcn-backed select shell with optional reactive value binding. */
export function Select({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultOpen = resolveXmlBoolean(props, 'defaultOpen', ctx);
    const defaultValue = resolveXmlString(props, 'defaultValue', ctx);
    const open = resolveXmlBoolean(props, 'open', ctx);
    const value = resolveXmlValue(props, 'value', ctx);
    const { state, snapshot } = useXmlValueSnapshot(value);

    // Bind directly to Valtio-backed state slots so selects stay in sync with XML state.
    if (state) {
        const currentValue =
            snapshot && typeof snapshot === 'object' && 'value' in snapshot ? snapshot.value : snapshot;

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
                {renderNode(nodes, ctx)}
            </UISelect>
        );
    }

    const initialValue = value != null ? String(value) : defaultValue;

    return (
        <UISelect defaultOpen={defaultOpen} defaultValue={initialValue} open={open}>
            {renderNode(nodes, ctx)}
        </UISelect>
    );
}

/** Renders the select trigger slot. */
export function SelectTrigger({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UISelectTrigger>{renderNode(nodes, ctx)}</UISelectTrigger>;
}

/** Renders the selected value placeholder or active choice. */
export function SelectValue({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const placeholder = props.i18n ? resolveTranslation(props, ctx) : resolveXmlString(props, 'placeholder', ctx);
    return <UISelectValue placeholder={placeholder} />;
}

/** Renders the select content portal and list surface. */
export function SelectContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UISelectContent>{renderNode(nodes, ctx)}</UISelectContent>;
}

/** Renders a grouped section inside the select menu. */
export function SelectGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UISelectGroup>{renderNode(nodes, ctx)}</UISelectGroup>;
}

/** Renders the label for a grouped select section. */
export function SelectLabel({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UISelectLabel>{text}</UISelectLabel>;
}

/** Renders a selectable option in the menu. */
export function SelectItem({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = requireXmlString(props, 'value', ctx, 'SelectItem');
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UISelectItem value={value}>{text}</UISelectItem>;
}

/** Renders a visual separator between select groups. */
export function SelectSeparator() {
    return <UISelectSeparator />;
}

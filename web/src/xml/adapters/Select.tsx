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
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { getVersion, useSnapshot } from 'valtio';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Props accepted by the XML Select component. */
export interface SelectProps extends Props {}

/** Props accepted by the XML SelectTrigger component. */
export interface SelectTriggerProps extends Props {}

/** Props accepted by the XML SelectValue component. */
export interface SelectValueProps extends Props {}

/** Props accepted by the XML SelectContent component. */
export interface SelectContentProps extends Props {}

/** Props accepted by the XML SelectGroup component. */
export interface SelectGroupProps extends Props {}

/** Props accepted by the XML SelectLabel component. */
export interface SelectLabelProps extends Props {}

/** Props accepted by the XML SelectItem component. */
export interface SelectItemProps extends Props {}

/** Renders a shadcn-backed select shell with optional reactive value binding. */
export function Select({ props, nodes }: SelectProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
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
export function SelectTrigger({ props, nodes }: SelectTriggerProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UISelectTrigger>{renderNode(children ?? [], ctx)}</UISelectTrigger>;
}

/** Renders the selected value placeholder or active choice. */
export function SelectValue({ props, nodes }: SelectValueProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const placeholder = resolveXmlString(props, 'placeholder', ctx);
    return <UISelectValue placeholder={placeholder} />;
}

/** Renders the select content portal and list surface. */
export function SelectContent({ props, nodes }: SelectContentProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UISelectContent>{renderNode(children ?? [], ctx)}</UISelectContent>;
}

/** Renders a grouped section inside the select menu. */
export function SelectGroup({ props, nodes }: SelectGroupProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UISelectGroup>{renderNode(children ?? [], ctx)}</UISelectGroup>;
}

/** Renders the label for a grouped select section. */
export function SelectLabel({ props, nodes }: SelectLabelProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UISelectLabel>{renderNode(children ?? [], ctx)}</UISelectLabel>;
}

/** Renders a selectable option in the menu. */
export function SelectItem({ props, nodes }: SelectItemProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const value = resolveXmlString(props, 'value', ctx);

    if (!value) throw new Error('SelectItem requires a value');

    return <UISelectItem value={value}>{renderNode(children ?? [], ctx)}</UISelectItem>;
}

/** Renders a visual separator between select groups. */
export function SelectSeparator() {
    return <UISelectSeparator />;
}

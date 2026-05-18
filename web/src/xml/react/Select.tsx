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
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML Select component. */
export interface SelectProps {
    children?: ASTNode[];
    defaultOpen?: boolean;
    defaultValue?: string;
    open?: boolean;
    value?: string | number | boolean | Record<string, unknown>;
}

/** Props accepted by the XML SelectTrigger component. */
export interface SelectTriggerProps {
    children?: ASTNode[];
}

/** Props accepted by the XML SelectValue component. */
export interface SelectValueProps {
    placeholder?: string;
}

/** Props accepted by the XML SelectContent component. */
export interface SelectContentProps {
    children?: ASTNode[];
}

/** Props accepted by the XML SelectGroup component. */
export interface SelectGroupProps {
    children?: ASTNode[];
}

/** Props accepted by the XML SelectLabel component. */
export interface SelectLabelProps {
    children?: ASTNode[];
}

/** Props accepted by the XML SelectItem component. */
export interface SelectItemProps {
    children?: ASTNode[];
    value?: string;
}

/** Renders a shadcn-backed select shell with optional reactive value binding. */
export function Select({ children, defaultOpen, defaultValue, open, value }: SelectProps) {
    const { ctx } = useXmlContext();

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
export function SelectTrigger({ children }: SelectTriggerProps) {
    const { ctx } = useXmlContext();

    return <UISelectTrigger>{renderNode(children ?? [], ctx)}</UISelectTrigger>;
}

/** Renders the selected value placeholder or active choice. */
export function SelectValue({ placeholder }: SelectValueProps) {
    return <UISelectValue placeholder={placeholder} />;
}

/** Renders the select content portal and list surface. */
export function SelectContent({ children }: SelectContentProps) {
    const { ctx } = useXmlContext();

    return <UISelectContent>{renderNode(children ?? [], ctx)}</UISelectContent>;
}

/** Renders a grouped section inside the select menu. */
export function SelectGroup({ children }: SelectGroupProps) {
    const { ctx } = useXmlContext();

    return <UISelectGroup>{renderNode(children ?? [], ctx)}</UISelectGroup>;
}

/** Renders the label for a grouped select section. */
export function SelectLabel({ children }: SelectLabelProps) {
    const { ctx } = useXmlContext();

    return <UISelectLabel>{renderNode(children ?? [], ctx)}</UISelectLabel>;
}

/** Renders a selectable option in the menu. */
export function SelectItem({ children, value }: SelectItemProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('SelectItem requires a value');

    return <UISelectItem value={value}>{renderNode(children ?? [], ctx)}</UISelectItem>;
}

/** Renders a visual separator between select groups. */
export function SelectSeparator() {
    return <UISelectSeparator />;
}

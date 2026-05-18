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
    children?: ASTNode | ASTNode[] | null;
    defaultOpen?: boolean;
    defaultValue?: string;
    open?: boolean;
    value?: string | number | boolean | Record<string, unknown>;
}

/** Props accepted by the XML SelectTrigger component. */
export interface SelectTriggerProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML SelectValue component. */
export interface SelectValueProps {
    className?: string;
    placeholder?: string;
}

/** Props accepted by the XML SelectContent component. */
export interface SelectContentProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML SelectGroup component. */
export interface SelectGroupProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML SelectLabel component. */
export interface SelectLabelProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML SelectItem component. */
export interface SelectItemProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    value?: string;
}

/** Props accepted by the XML SelectSeparator component. */
export interface SelectSeparatorProps {
    className?: string;
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
                {renderNode(children ?? null, ctx)}
            </UISelect>
        );
    }

    const initialValue = value != null ? String(value) : defaultValue;

    return (
        <UISelect defaultOpen={defaultOpen} defaultValue={initialValue} open={open}>
            {renderNode(children ?? null, ctx)}
        </UISelect>
    );
}

/** Renders the select trigger slot. */
export function SelectTrigger({ children, className }: SelectTriggerProps) {
    const { ctx } = useXmlContext();

    return <UISelectTrigger className={className}>{renderNode(children ?? null, ctx)}</UISelectTrigger>;
}

/** Renders the selected value placeholder or active choice. */
export function SelectValue({ className, placeholder }: SelectValueProps) {
    return <UISelectValue className={className} placeholder={placeholder} />;
}

/** Renders the select content portal and list surface. */
export function SelectContent({ children, className }: SelectContentProps) {
    const { ctx } = useXmlContext();

    return <UISelectContent className={className}>{renderNode(children ?? null, ctx)}</UISelectContent>;
}

/** Renders a grouped section inside the select menu. */
export function SelectGroup({ children, className }: SelectGroupProps) {
    const { ctx } = useXmlContext();

    return <UISelectGroup className={className}>{renderNode(children ?? null, ctx)}</UISelectGroup>;
}

/** Renders the label for a grouped select section. */
export function SelectLabel({ children, className }: SelectLabelProps) {
    const { ctx } = useXmlContext();

    return <UISelectLabel className={className}>{renderNode(children ?? null, ctx)}</UISelectLabel>;
}

/** Renders a selectable option in the menu. */
export function SelectItem({ children, className, value }: SelectItemProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('SelectItem requires a value');

    return (
        <UISelectItem className={className} value={value}>
            {renderNode(children ?? null, ctx)}
        </UISelectItem>
    );
}

/** Renders a visual separator between select groups. */
export function SelectSeparator({ className }: SelectSeparatorProps) {
    return <UISelectSeparator className={className} />;
}

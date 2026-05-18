import {
    ButtonGroup as UIButtonGroup,
    ButtonGroupSeparator as UIButtonGroupSeparator,
    ButtonGroupText as UIButtonGroupText,
} from '@/components/ui/button-group';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ButtonGroup component. */
export interface ButtonGroupProps {
    children?: ASTNode[];
    orientation?: 'horizontal' | 'vertical';
}

/** Props accepted by the XML ButtonGroupText component. */
export interface ButtonGroupTextProps {
    children?: ASTNode[];
}

/** Props accepted by the XML ButtonGroupSeparator component. */
export interface ButtonGroupSeparatorProps {
    orientation?: 'horizontal' | 'vertical';
}

/** Renders a grouped action shell for buttons and inputs. */
export function ButtonGroup({ children, orientation = 'horizontal' }: ButtonGroupProps) {
    const { ctx } = useXmlContext();

    return <UIButtonGroup orientation={orientation}>{renderNode(children ?? [], ctx)}</UIButtonGroup>;
}

/** Renders an inline text segment inside a button group. */
export function ButtonGroupText({ children }: ButtonGroupTextProps) {
    const { ctx } = useXmlContext();

    return <UIButtonGroupText>{renderNode(children ?? [], ctx)}</UIButtonGroupText>;
}

/** Renders a separator between grouped button segments. */
export function ButtonGroupSeparator({ orientation = 'vertical' }: ButtonGroupSeparatorProps) {
    return <UIButtonGroupSeparator orientation={orientation} />;
}

import {
    ButtonGroup as UIButtonGroup,
    ButtonGroupSeparator as UIButtonGroupSeparator,
    ButtonGroupText as UIButtonGroupText,
} from '@/components/ui/button-group';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ButtonGroup component. */
export interface ButtonGroupProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    orientation?: 'horizontal' | 'vertical';
}

/** Props accepted by the XML ButtonGroupText component. */
export interface ButtonGroupTextProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML ButtonGroupSeparator component. */
export interface ButtonGroupSeparatorProps {
    className?: string;
    orientation?: 'horizontal' | 'vertical';
}

/** Renders a grouped action shell for buttons and inputs. */
export function ButtonGroup({ children, className, orientation = 'horizontal' }: ButtonGroupProps) {
    const { ctx } = useXmlContext();

    return (
        <UIButtonGroup className={className} orientation={orientation}>
            {renderNode(children ?? null, ctx)}
        </UIButtonGroup>
    );
}

/** Renders an inline text segment inside a button group. */
export function ButtonGroupText({ children, className }: ButtonGroupTextProps) {
    const { ctx } = useXmlContext();

    return <UIButtonGroupText className={className}>{renderNode(children ?? null, ctx)}</UIButtonGroupText>;
}

/** Renders a separator between grouped button segments. */
export function ButtonGroupSeparator({ className, orientation = 'vertical' }: ButtonGroupSeparatorProps) {
    return <UIButtonGroupSeparator className={className} orientation={orientation} />;
}

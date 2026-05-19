import {
    ButtonGroup as UIButtonGroup,
    ButtonGroupSeparator as UIButtonGroupSeparator,
    ButtonGroupText as UIButtonGroupText,
} from '@/components/ui/button-group';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Props accepted by the XML ButtonGroup component. */
export interface ButtonGroupProps extends Props {}

/** Props accepted by the XML ButtonGroupText component. */
export interface ButtonGroupTextProps extends Props {}

/** Props accepted by the XML ButtonGroupSeparator component. */
export interface ButtonGroupSeparatorProps extends Props {}

/** Renders a grouped action shell for buttons and inputs. */
export function ButtonGroup({ props, nodes }: ButtonGroupProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');

    return <UIButtonGroup orientation={orientation}>{renderNode(children ?? [], ctx)}</UIButtonGroup>;
}

/** Renders an inline text segment inside a button group. */
export function ButtonGroupText({ props, nodes }: ButtonGroupTextProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIButtonGroupText>{renderNode(children ?? [], ctx)}</UIButtonGroupText>;
}

/** Renders a separator between grouped button segments. */
export function ButtonGroupSeparator({ props, nodes }: ButtonGroupSeparatorProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const orientation = resolveXmlString(props, 'orientation', ctx, 'vertical');
    return <UIButtonGroupSeparator orientation={orientation} />;
}

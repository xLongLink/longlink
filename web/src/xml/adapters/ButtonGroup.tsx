import {
    ButtonGroup as UIButtonGroup,
    ButtonGroupSeparator as UIButtonGroupSeparator,
    ButtonGroupText as UIButtonGroupText,
} from '@/components/ui/button-group';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Renders a grouped action shell for buttons and inputs. */
export function ButtonGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');

    return <UIButtonGroup orientation={orientation}>{renderNode(children ?? [], ctx)}</UIButtonGroup>;
}

/** Renders an inline text segment inside a button group. */
export function ButtonGroupText({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIButtonGroupText>{renderNode(children ?? [], ctx)}</UIButtonGroupText>;
}

/** Renders a separator between grouped button segments. */
export function ButtonGroupSeparator({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const orientation = resolveXmlString(props, 'orientation', ctx, 'vertical');
    return <UIButtonGroupSeparator orientation={orientation} />;
}

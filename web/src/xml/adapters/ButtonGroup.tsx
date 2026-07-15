import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import {
    ButtonGroup as UIButtonGroup,
    ButtonGroupSeparator as UIButtonGroupSeparator,
    ButtonGroupText as UIButtonGroupText,
} from '@/components/ui/button-group';
import { resolveXmlString } from './props';

/** Renders a grouped action shell for buttons and inputs. */
export function ButtonGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');

    return <UIButtonGroup orientation={orientation}>{renderNode(nodes, ctx)}</UIButtonGroup>;
}

/** Renders an inline text segment inside a button group. */
export function ButtonGroupText({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIButtonGroupText>{text}</UIButtonGroupText>;
}

/** Renders a separator between grouped button segments. */
export function ButtonGroupSeparator({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const orientation = resolveXmlString(props, 'orientation', ctx, 'vertical');
    return <UIButtonGroupSeparator orientation={orientation} />;
}

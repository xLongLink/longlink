import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import {
    Field as UIField,
    FieldContent as UIFieldContent,
    FieldDescription as UIFieldDescription,
    FieldLabel as UIFieldLabel,
    FieldLegend as UIFieldLegend,
    FieldTitle as UIFieldTitle,
} from '@/components/ui/field';
import { resolveXmlString } from './props';

/** Renders the field legend slot. */
export function FieldLegend({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);
    const variant = resolveXmlString(props, 'variant', ctx, 'legend');

    return <UIFieldLegend variant={variant}>{text}</UIFieldLegend>;
}

/** Renders an individual field row. */
export function Field({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const orientation = resolveXmlString(props, 'orientation', ctx, 'vertical');

    return <UIField orientation={orientation}>{renderNode(nodes, ctx)}</UIField>;
}

/** Renders the field content slot. */
export function FieldContent({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIFieldContent>{renderNode(nodes, ctx)}</UIFieldContent>;
}

/** Renders the field label slot. */
export function FieldLabel({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const htmlFor = resolveXmlString(props, 'htmlFor', ctx);
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIFieldLabel htmlFor={htmlFor}>{text}</UIFieldLabel>;
}

/** Renders the field title slot. */
export function FieldTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIFieldTitle>{text}</UIFieldTitle>;
}

/** Renders the field description slot. */
export function FieldDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIFieldDescription>{text}</UIFieldDescription>;
}

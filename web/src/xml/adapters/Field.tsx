import {
    Field as UIField,
    FieldContent as UIFieldContent,
    FieldDescription as UIFieldDescription,
    FieldError as UIFieldError,
    FieldGroup as UIFieldGroup,
    FieldLabel as UIFieldLabel,
    FieldLegend as UIFieldLegend,
    FieldSeparator as UIFieldSeparator,
    FieldSet as UIFieldSet,
    FieldTitle as UIFieldTitle,
} from '@/components/ui/field';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlString, resolveXmlValue } from './props';

/** Renders a grouped fieldset shell. */
export function FieldSet({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIFieldSet>{renderNode(nodes, ctx)}</UIFieldSet>;
}

/** Renders the fieldset legend slot. */
export function FieldLegend({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const variant = resolveXmlString(props, 'variant', ctx, 'legend');

    return <UIFieldLegend variant={variant}>{renderNode(nodes, ctx)}</UIFieldLegend>;
}

/** Renders a field group container. */
export function FieldGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIFieldGroup>{renderNode(nodes, ctx)}</UIFieldGroup>;
}

/** Renders an individual field row. */
export function Field({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const orientation = resolveXmlString(props, 'orientation', ctx, 'vertical');

    return <UIField orientation={orientation}>{renderNode(nodes, ctx)}</UIField>;
}

/** Renders the field content slot. */
export function FieldContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIFieldContent>{renderNode(nodes, ctx)}</UIFieldContent>;
}

/** Renders the field label slot. */
export function FieldLabel({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const htmlFor = resolveXmlString(props, 'htmlFor', ctx);

    return <UIFieldLabel htmlFor={htmlFor}>{renderNode(nodes, ctx)}</UIFieldLabel>;
}

/** Renders the field title slot. */
export function FieldTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIFieldTitle>{renderNode(nodes, ctx)}</UIFieldTitle>;
}

/** Renders the field description slot. */
export function FieldDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIFieldDescription>{renderNode(nodes, ctx)}</UIFieldDescription>;
}

/** Renders a separator between field sections. */
export function FieldSeparator({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIFieldSeparator>{renderNode(nodes, ctx)}</UIFieldSeparator>;
}

/** Renders the field error slot. */
export function FieldError({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const errors = resolveXmlValue(props, 'errors', ctx);
    const normalizedErrors = typeof errors === 'string' ? [{ message: errors }] : errors;

    return <UIFieldError errors={normalizedErrors}>{renderNode(nodes, ctx)}</UIFieldError>;
}

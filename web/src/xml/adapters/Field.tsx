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
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString, resolveXmlValue } from './props';

/** Renders a grouped fieldset shell. */
export function FieldSet({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldSet>{renderNode(children ?? [], ctx)}</UIFieldSet>;
}

/** Renders the fieldset legend slot. */
export function FieldLegend({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const variant = resolveXmlString(props, 'variant', ctx, 'legend');

    return <UIFieldLegend variant={variant}>{renderNode(children ?? [], ctx)}</UIFieldLegend>;
}

/** Renders a field group container. */
export function FieldGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldGroup>{renderNode(children ?? [], ctx)}</UIFieldGroup>;
}

/** Renders an individual field row. */
export function Field({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const orientation = resolveXmlString(props, 'orientation', ctx, 'vertical');

    return <UIField orientation={orientation}>{renderNode(children ?? [], ctx)}</UIField>;
}

/** Renders the field content slot. */
export function FieldContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldContent>{renderNode(children ?? [], ctx)}</UIFieldContent>;
}

/** Renders the field label slot. */
export function FieldLabel({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const htmlFor = resolveXmlString(props, 'htmlFor', ctx);

    return <UIFieldLabel htmlFor={htmlFor}>{renderNode(children ?? [], ctx)}</UIFieldLabel>;
}

/** Renders the field title slot. */
export function FieldTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldTitle>{renderNode(children ?? [], ctx)}</UIFieldTitle>;
}

/** Renders the field description slot. */
export function FieldDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldDescription>{renderNode(children ?? [], ctx)}</UIFieldDescription>;
}

/** Renders a separator between field sections. */
export function FieldSeparator({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldSeparator>{renderNode(children ?? [], ctx)}</UIFieldSeparator>;
}

/** Renders the field error slot. */
export function FieldError({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const errors = resolveXmlValue(props, 'errors', ctx);
    const normalizedErrors = typeof errors === 'string' ? [{ message: errors }] : errors;

    return <UIFieldError errors={normalizedErrors}>{renderNode(children ?? [], ctx)}</UIFieldError>;
}

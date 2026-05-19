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

/** Props accepted by the XML FieldSet component. */
export interface FieldSetProps extends Props {}

/** Props accepted by the XML FieldLegend component. */
export interface FieldLegendProps extends Props {}

/** Props accepted by the XML FieldGroup component. */
export interface FieldGroupProps extends Props {}

/** Props accepted by the XML Field component. */
export interface FieldProps extends Props {}

/** Props accepted by the XML FieldContent component. */
export interface FieldContentProps extends Props {}

/** Props accepted by the XML FieldLabel component. */
export interface FieldLabelProps extends Props {}

/** Props accepted by the XML FieldTitle component. */
export interface FieldTitleProps extends Props {}

/** Props accepted by the XML FieldDescription component. */
export interface FieldDescriptionProps extends Props {}

/** Props accepted by the XML FieldSeparator component. */
export interface FieldSeparatorProps extends Props {}

/** Props accepted by the XML FieldError component. */
export interface FieldErrorProps extends Props {}

/** Renders a grouped fieldset shell. */
export function FieldSet({ props, nodes }: FieldSetProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldSet>{renderNode(children ?? [], ctx)}</UIFieldSet>;
}

/** Renders the fieldset legend slot. */
export function FieldLegend({ props, nodes }: FieldLegendProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const variant = resolveXmlString(props, 'variant', ctx, 'legend');

    return <UIFieldLegend variant={variant}>{renderNode(children ?? [], ctx)}</UIFieldLegend>;
}

/** Renders a field group container. */
export function FieldGroup({ props, nodes }: FieldGroupProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldGroup>{renderNode(children ?? [], ctx)}</UIFieldGroup>;
}

/** Renders an individual field row. */
export function Field({ props, nodes }: FieldProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const orientation = resolveXmlString(props, 'orientation', ctx, 'vertical');

    return <UIField orientation={orientation}>{renderNode(children ?? [], ctx)}</UIField>;
}

/** Renders the field content slot. */
export function FieldContent({ props, nodes }: FieldContentProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldContent>{renderNode(children ?? [], ctx)}</UIFieldContent>;
}

/** Renders the field label slot. */
export function FieldLabel({ props, nodes }: FieldLabelProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const htmlFor = resolveXmlString(props, 'htmlFor', ctx);

    return <UIFieldLabel htmlFor={htmlFor}>{renderNode(children ?? [], ctx)}</UIFieldLabel>;
}

/** Renders the field title slot. */
export function FieldTitle({ props, nodes }: FieldTitleProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldTitle>{renderNode(children ?? [], ctx)}</UIFieldTitle>;
}

/** Renders the field description slot. */
export function FieldDescription({ props, nodes }: FieldDescriptionProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldDescription>{renderNode(children ?? [], ctx)}</UIFieldDescription>;
}

/** Renders a separator between field sections. */
export function FieldSeparator({ props, nodes }: FieldSeparatorProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIFieldSeparator>{renderNode(children ?? [], ctx)}</UIFieldSeparator>;
}

/** Renders the field error slot. */
export function FieldError({ props, nodes }: FieldErrorProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const errors = resolveXmlValue(props, 'errors', ctx);
    const normalizedErrors = typeof errors === 'string' ? [{ message: errors }] : errors;

    return <UIFieldError errors={normalizedErrors}>{renderNode(children ?? [], ctx)}</UIFieldError>;
}

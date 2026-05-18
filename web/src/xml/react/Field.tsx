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
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML FieldSet component. */
export interface FieldSetProps {
    children?: ASTNode[];
}

/** Props accepted by the XML FieldLegend component. */
export interface FieldLegendProps {
    children?: ASTNode[];
    variant?: 'legend' | 'label';
}

/** Props accepted by the XML FieldGroup component. */
export interface FieldGroupProps {
    children?: ASTNode[];
}

/** Props accepted by the XML Field component. */
export interface FieldProps {
    children?: ASTNode[];
    orientation?: 'vertical' | 'horizontal' | 'responsive';
}

/** Props accepted by the XML FieldContent component. */
export interface FieldContentProps {
    children?: ASTNode[];
}

/** Props accepted by the XML FieldLabel component. */
export interface FieldLabelProps {
    children?: ASTNode[];
    htmlFor?: string;
}

/** Props accepted by the XML FieldTitle component. */
export interface FieldTitleProps {
    children?: ASTNode[];
}

/** Props accepted by the XML FieldDescription component. */
export interface FieldDescriptionProps {
    children?: ASTNode[];
}

/** Props accepted by the XML FieldSeparator component. */
export interface FieldSeparatorProps {
    children?: ASTNode[];
}

/** Props accepted by the XML FieldError component. */
export interface FieldErrorProps {
    children?: ASTNode[];
    errors?: Array<{ message?: string } | undefined> | string;
}

/** Renders a grouped fieldset shell. */
export function FieldSet({ children }: FieldSetProps) {
    const { ctx } = useXmlContext();

    return <UIFieldSet>{renderNode(children ?? [], ctx)}</UIFieldSet>;
}

/** Renders the fieldset legend slot. */
export function FieldLegend({ children, variant = 'legend' }: FieldLegendProps) {
    const { ctx } = useXmlContext();

    return <UIFieldLegend variant={variant}>{renderNode(children ?? [], ctx)}</UIFieldLegend>;
}

/** Renders a field group container. */
export function FieldGroup({ children }: FieldGroupProps) {
    const { ctx } = useXmlContext();

    return <UIFieldGroup>{renderNode(children ?? [], ctx)}</UIFieldGroup>;
}

/** Renders an individual field row. */
export function Field({ children, orientation = 'vertical' }: FieldProps) {
    const { ctx } = useXmlContext();

    return <UIField orientation={orientation}>{renderNode(children ?? [], ctx)}</UIField>;
}

/** Renders the field content slot. */
export function FieldContent({ children }: FieldContentProps) {
    const { ctx } = useXmlContext();

    return <UIFieldContent>{renderNode(children ?? [], ctx)}</UIFieldContent>;
}

/** Renders the field label slot. */
export function FieldLabel({ children, htmlFor }: FieldLabelProps) {
    const { ctx } = useXmlContext();

    return <UIFieldLabel htmlFor={htmlFor}>{renderNode(children ?? [], ctx)}</UIFieldLabel>;
}

/** Renders the field title slot. */
export function FieldTitle({ children }: FieldTitleProps) {
    const { ctx } = useXmlContext();

    return <UIFieldTitle>{renderNode(children ?? [], ctx)}</UIFieldTitle>;
}

/** Renders the field description slot. */
export function FieldDescription({ children }: FieldDescriptionProps) {
    const { ctx } = useXmlContext();

    return <UIFieldDescription>{renderNode(children ?? [], ctx)}</UIFieldDescription>;
}

/** Renders a separator between field sections. */
export function FieldSeparator({ children }: FieldSeparatorProps) {
    const { ctx } = useXmlContext();

    return <UIFieldSeparator>{renderNode(children ?? [], ctx)}</UIFieldSeparator>;
}

/** Renders the field error slot. */
export function FieldError({ children, errors }: FieldErrorProps) {
    const { ctx } = useXmlContext();
    const normalizedErrors = typeof errors === 'string' ? [{ message: errors }] : errors;

    return <UIFieldError errors={normalizedErrors}>{renderNode(children ?? [], ctx)}</UIFieldError>;
}

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
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML FieldLegend component. */
export interface FieldLegendProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    variant?: 'legend' | 'label';
}

/** Props accepted by the XML FieldGroup component. */
export interface FieldGroupProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML Field component. */
export interface FieldProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    orientation?: 'vertical' | 'horizontal' | 'responsive';
}

/** Props accepted by the XML FieldContent component. */
export interface FieldContentProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML FieldLabel component. */
export interface FieldLabelProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    htmlFor?: string;
}

/** Props accepted by the XML FieldTitle component. */
export interface FieldTitleProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML FieldDescription component. */
export interface FieldDescriptionProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML FieldSeparator component. */
export interface FieldSeparatorProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML FieldError component. */
export interface FieldErrorProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    errors?: Array<{ message?: string } | undefined> | string;
}

/** Renders a grouped fieldset shell. */
export function FieldSet({ children, className }: FieldSetProps) {
    const { ctx } = useXmlContext();

    return <UIFieldSet className={className}>{renderNode(children ?? null, ctx)}</UIFieldSet>;
}

/** Renders the fieldset legend slot. */
export function FieldLegend({ children, className, variant = 'legend' }: FieldLegendProps) {
    const { ctx } = useXmlContext();

    return (
        <UIFieldLegend className={className} variant={variant}>
            {renderNode(children ?? null, ctx)}
        </UIFieldLegend>
    );
}

/** Renders a field group container. */
export function FieldGroup({ children, className }: FieldGroupProps) {
    const { ctx } = useXmlContext();

    return <UIFieldGroup className={className}>{renderNode(children ?? null, ctx)}</UIFieldGroup>;
}

/** Renders an individual field row. */
export function Field({ children, className, orientation = 'vertical' }: FieldProps) {
    const { ctx } = useXmlContext();

    return (
        <UIField className={className} orientation={orientation}>
            {renderNode(children ?? null, ctx)}
        </UIField>
    );
}

/** Renders the field content slot. */
export function FieldContent({ children, className }: FieldContentProps) {
    const { ctx } = useXmlContext();

    return <UIFieldContent className={className}>{renderNode(children ?? null, ctx)}</UIFieldContent>;
}

/** Renders the field label slot. */
export function FieldLabel({ children, className, htmlFor }: FieldLabelProps) {
    const { ctx } = useXmlContext();

    return (
        <UIFieldLabel className={className} htmlFor={htmlFor}>
            {renderNode(children ?? null, ctx)}
        </UIFieldLabel>
    );
}

/** Renders the field title slot. */
export function FieldTitle({ children, className }: FieldTitleProps) {
    const { ctx } = useXmlContext();

    return <UIFieldTitle className={className}>{renderNode(children ?? null, ctx)}</UIFieldTitle>;
}

/** Renders the field description slot. */
export function FieldDescription({ children, className }: FieldDescriptionProps) {
    const { ctx } = useXmlContext();

    return <UIFieldDescription className={className}>{renderNode(children ?? null, ctx)}</UIFieldDescription>;
}

/** Renders a separator between field sections. */
export function FieldSeparator({ children, className }: FieldSeparatorProps) {
    const { ctx } = useXmlContext();

    return <UIFieldSeparator className={className}>{renderNode(children ?? null, ctx)}</UIFieldSeparator>;
}

/** Renders the field error slot. */
export function FieldError({ children, className, errors }: FieldErrorProps) {
    const { ctx } = useXmlContext();
    const normalizedErrors = typeof errors === 'string' ? [{ message: errors }] : errors;

    return (
        <UIFieldError className={className} errors={normalizedErrors}>
            {renderNode(children ?? null, ctx)}
        </UIFieldError>
    );
}

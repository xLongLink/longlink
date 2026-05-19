import {
    InputGroup as UIInputGroup,
    InputGroupAddon as UIInputGroupAddon,
    InputGroupButton as UIInputGroupButton,
    InputGroupInput as UIInputGroupInput,
    InputGroupText as UIInputGroupText,
    InputGroupTextarea as UIInputGroupTextarea,
} from '@/components/ui/input-group';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import type { XmlBindableValue } from '@xml/types';

import { useBindableValue } from './binding';

/** Props accepted by the XML InputGroup component. */
export interface InputGroupProps {
    children?: ASTNode[];
}

/** Props accepted by the XML InputGroupAddon component. */
export interface InputGroupAddonProps {
    children?: ASTNode[];
    align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
}

/** Props accepted by the XML InputGroupButton component. */
export interface InputGroupButtonProps {
    children?: ASTNode[];
    size?: 'xs' | 'sm' | 'icon-xs' | 'icon-sm';
    type?: 'button' | 'submit' | 'reset';
    variant?: React.ComponentProps<typeof UIInputGroupButton>['variant'];
    disabled?: boolean;
}

/** Props accepted by the XML InputGroupText component. */
export interface InputGroupTextProps {
    children?: ASTNode[];
}

/** Props accepted by the XML InputGroupInput component. */
export interface InputGroupInputProps {
    'aria-invalid'?: boolean;
    autoComplete?: string;
    disabled?: boolean;
    id?: string;
    label?: string;
    placeholder?: string | number | boolean;
    value?: XmlBindableValue;
    type?: string;
}

/** Props accepted by the XML InputGroupTextarea component. */
export interface InputGroupTextareaProps {
    cols?: number | string;
    disabled?: boolean;
    id?: string;
    label?: string;
    placeholder?: string | number | boolean;
    rows?: number | string;
    value?: XmlBindableValue;
}

/** Renders the shared input group shell. */
export function InputGroup({ children }: InputGroupProps) {
    const { ctx } = useXmlContext();

    return <UIInputGroup>{renderNode(children ?? [], ctx)}</UIInputGroup>;
}

/** Renders an input group addon slot. */
export function InputGroupAddon({ children, align = 'inline-start' }: InputGroupAddonProps) {
    const { ctx } = useXmlContext();

    return <UIInputGroupAddon align={align}>{renderNode(children ?? [], ctx)}</UIInputGroupAddon>;
}

/** Renders a button inside an input group. */
export function InputGroupButton({
    children,
    disabled,
    size = 'xs',
    type = 'button',
    variant = 'ghost',
}: InputGroupButtonProps) {
    const { ctx } = useXmlContext();

    return (
        <UIInputGroupButton disabled={disabled} size={size} type={type} variant={variant}>
            {renderNode(children ?? [], ctx)}
        </UIInputGroupButton>
    );
}

/** Renders inline text inside an input group. */
export function InputGroupText({ children }: InputGroupTextProps) {
    const { ctx } = useXmlContext();

    return <UIInputGroupText data-slot="input-group-text">{renderNode(children ?? [], ctx)}</UIInputGroupText>;
}

/** Renders a reactive input control inside an input group. */
export function InputGroupInput({
    'aria-invalid': ariaInvalid,
    autoComplete,
    disabled,
    id,
    value = '',
    label,
    placeholder,
    type = 'text',
}: InputGroupInputProps) {
    const placeholderText = String(placeholder ?? label ?? '');
    const binding = useBindableValue(value, type);

    if (binding.bound) {
        return (
            <UIInputGroupInput
                aria-invalid={ariaInvalid}
                autoComplete={autoComplete}
                disabled={disabled}
                id={id}
                type={type}
                placeholder={placeholderText}
                value={binding.currentValue}
                onChange={(event) => {
                    binding.setValue(event.target.value);
                }}
            />
        );
    }

    return (
        <UIInputGroupInput
            aria-invalid={ariaInvalid}
            autoComplete={autoComplete}
            disabled={disabled}
            id={id}
            type={type}
            placeholder={placeholderText}
            defaultValue={binding.initialValue}
        />
    );
}

/** Renders a reactive textarea control inside an input group. */
export function InputGroupTextarea({
    cols,
    disabled,
    id,
    value = '',
    label,
    placeholder,
    rows,
}: InputGroupTextareaProps) {
    const placeholderText = String(placeholder ?? label ?? '');
    // Normalize XML string attributes to the numeric textarea props expected by React.
    const resolvedCols = typeof cols === 'string' ? Number(cols) : cols;
    const resolvedRows = typeof rows === 'string' ? Number(rows) : rows;
    const binding = useBindableValue(value);

    if (binding.bound) {
        return (
            <UIInputGroupTextarea
                cols={Number.isNaN(resolvedCols ?? Number.NaN) ? undefined : resolvedCols}
                disabled={disabled}
                id={id}
                placeholder={placeholderText}
                rows={Number.isNaN(resolvedRows ?? Number.NaN) ? undefined : resolvedRows}
                value={binding.currentValue}
                onChange={(event) => {
                    binding.setValue(event.target.value);
                }}
            />
        );
    }

    return (
        <UIInputGroupTextarea
            cols={Number.isNaN(resolvedCols ?? Number.NaN) ? undefined : resolvedCols}
            disabled={disabled}
            id={id}
            placeholder={placeholderText}
            rows={Number.isNaN(resolvedRows ?? Number.NaN) ? undefined : resolvedRows}
            defaultValue={binding.initialValue}
        />
    );
}

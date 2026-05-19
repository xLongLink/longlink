import {
    InputGroup as UIInputGroup,
    InputGroupAddon as UIInputGroupAddon,
    InputGroupButton as UIInputGroupButton,
    InputGroupInput as UIInputGroupInput,
    InputGroupText as UIInputGroupText,
    InputGroupTextarea as UIInputGroupTextarea,
} from '@/components/ui/input-group';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

import { useBindableValue } from './binding';

/** Props accepted by the XML InputGroup component. */
export interface InputGroupProps extends Props {}

/** Props accepted by the XML InputGroupAddon component. */
export interface InputGroupAddonProps extends Props {}

/** Props accepted by the XML InputGroupButton component. */
export interface InputGroupButtonProps extends Props {}

/** Props accepted by the XML InputGroupText component. */
export interface InputGroupTextProps extends Props {}

/** Props accepted by the XML InputGroupInput component. */
export interface InputGroupInputProps extends Props {}

/** Props accepted by the XML InputGroupTextarea component. */
export interface InputGroupTextareaProps extends Props {}

/** Renders the shared input group shell. */
export function InputGroup({ props, nodes }: InputGroupProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIInputGroup>{renderNode(children ?? [], ctx)}</UIInputGroup>;
}

/** Renders an input group addon slot. */
export function InputGroupAddon({ props, nodes }: InputGroupAddonProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const align = resolveXmlString(props, 'align', ctx, 'inline-start');

    return <UIInputGroupAddon align={align}>{renderNode(children ?? [], ctx)}</UIInputGroupAddon>;
}

/** Renders a button inside an input group. */
export function InputGroupButton({ props, nodes }: InputGroupButtonProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const size = resolveXmlString(props, 'size', ctx, 'xs');
    const type = resolveXmlString(props, 'type', ctx, 'button');
    const variant = resolveXmlString(props, 'variant', ctx, 'ghost');

    return (
        <UIInputGroupButton disabled={disabled} size={size} type={type} variant={variant}>
            {renderNode(children ?? [], ctx)}
        </UIInputGroupButton>
    );
}

/** Renders inline text inside an input group. */
export function InputGroupText({ props, nodes }: InputGroupTextProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UIInputGroupText data-slot="input-group-text">{renderNode(children ?? [], ctx)}</UIInputGroupText>;
}

/** Renders a reactive input control inside an input group. */
export function InputGroupInput({ props, nodes }: InputGroupInputProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const ariaInvalid = resolveXmlBoolean(props, 'aria-invalid', ctx);
    const autoComplete = resolveXmlString(props, 'autoComplete', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const value = resolveXmlValue(props, 'value', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const placeholder = resolveXmlValue(props, 'placeholder', ctx);
    const type = resolveXmlString(props, 'type', ctx, 'text');
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
export function InputGroupTextarea({ props, nodes }: InputGroupTextareaProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const cols = resolveXmlString(props, 'cols', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const value = resolveXmlValue(props, 'value', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const placeholder = resolveXmlValue(props, 'placeholder', ctx);
    const rows = resolveXmlString(props, 'rows', ctx);
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

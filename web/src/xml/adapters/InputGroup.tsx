import {
    InputGroup as UIInputGroup,
    InputGroupAddon as UIInputGroupAddon,
    InputGroupButton as UIInputGroupButton,
    InputGroupInput as UIInputGroupInput,
    InputGroupText as UIInputGroupText,
    InputGroupTextarea as UIInputGroupTextarea,
} from '@/components/ui/input-group';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';
import { resolveXmlBoolean, resolveXmlNumber, resolveXmlString, resolveXmlValue } from './props';

import { readBindableFileInputValue, useBindableValue } from './binding';

/** Props accepted by the XML InputGroup component. */

/** Props accepted by the XML InputGroupAddon component. */

/** Props accepted by the XML InputGroupButton component. */

/** Props accepted by the XML InputGroupText component. */

/** Props accepted by the XML InputGroupInput component. */

/** Props accepted by the XML InputGroupTextarea component. */

/** Renders the shared input group shell. */
export function InputGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIInputGroup>{renderNode(nodes, ctx)}</UIInputGroup>;
}

/** Renders an input group addon slot. */
export function InputGroupAddon({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const align = resolveXmlString(props, 'align', ctx, 'inline-start');

    return <UIInputGroupAddon align={align}>{renderNode(nodes, ctx)}</UIInputGroupAddon>;
}

/** Renders a button inside an input group. */
export function InputGroupButton({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const size = resolveXmlString(props, 'size', ctx, 'xs');
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);
    const type = resolveXmlString(props, 'type', ctx, 'button');
    const variant = resolveXmlString(props, 'variant', ctx, 'ghost');

    return (
        <UIInputGroupButton disabled={disabled} size={size} type={type} variant={variant}>
            {text}
        </UIInputGroupButton>
    );
}

/** Renders inline text inside an input group. */
export function InputGroupText({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UIInputGroupText data-slot="input-group-text">{text}</UIInputGroupText>;
}

/** Renders a reactive input control inside an input group. */
export function InputGroupInput({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const accept = resolveXmlString(props, 'accept', ctx);
    const ariaInvalid = resolveXmlBoolean(props, 'aria-invalid', ctx);
    const autoComplete = resolveXmlString(props, 'autoComplete', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const multiple = resolveXmlBoolean(props, 'multiple', ctx, false);
    const placeholder = props.i18n ? resolveTranslation(props, ctx) : resolveXmlValue(props, 'placeholder', ctx);
    const type = resolveXmlString(props, 'type', ctx, 'text');
    const placeholderText = String(placeholder ?? label ?? '');
    const binding = useBindableValue(props, 'value', ctx, type);

    if (type === 'file') {
        return (
            <UIInputGroupInput
                accept={accept}
                aria-invalid={ariaInvalid}
                autoComplete={autoComplete}
                disabled={disabled}
                id={id}
                type={type}
                multiple={multiple}
                onChange={
                    binding.bound
                        ? (event) => {
                              binding.setValue(readBindableFileInputValue(event.currentTarget, multiple));
                          }
                        : undefined
                }
            />
        );
    }

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
export function InputGroupTextarea({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const cols = resolveXmlNumber(props, 'cols', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const placeholder = props.i18n ? resolveTranslation(props, ctx) : resolveXmlValue(props, 'placeholder', ctx);
    const rows = resolveXmlNumber(props, 'rows', ctx);
    const placeholderText = String(placeholder ?? label ?? '');
    const binding = useBindableValue(props, 'value', ctx);

    if (binding.bound) {
        return (
            <UIInputGroupTextarea
                cols={cols}
                disabled={disabled}
                id={id}
                placeholder={placeholderText}
                rows={rows}
                value={binding.currentValue}
                onChange={(event) => {
                    binding.setValue(event.target.value);
                }}
            />
        );
    }

    return (
        <UIInputGroupTextarea
            cols={cols}
            disabled={disabled}
            id={id}
            placeholder={placeholderText}
            rows={rows}
            defaultValue={binding.initialValue}
        />
    );
}

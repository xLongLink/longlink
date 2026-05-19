import { compile, evaluate } from '@xml/core/expressions';
import { renderRegisteredNode } from '@xml/core/registry';
import { For } from '@xml/primitives/For';
import { Text } from '@xml/primitives/Text';
import { Button } from '@xml/react/Button';
import { Checkbox } from '@xml/react/Checkbox';
import { Input } from '@xml/react/Input';
import { InputGroupInput, InputGroupTextarea } from '@xml/react/InputGroup';
import { Slider } from '@xml/react/Slider';
import { Switch } from '@xml/react/Switch';
import { Textarea } from '@xml/react/Textarea';
import { Toggle } from '@xml/react/Toggle';
import { ToggleGroup, ToggleGroupItem } from '@xml/react/ToggleGroup';
import type { ASTNode, ExecutionContext, XmlBindableValue } from '@xml/types';
import { Fragment, type ReactNode } from 'react';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        // Handle conditional rendering with "if" parameter.
        if (node.params?.if != null) {
            if (!evaluate(node.params.if, ctx)) {
                return <Fragment key={index} />;
            }
        }

        const registeredNode = renderRegisteredNode(node, ctx, index);
        if (registeredNode !== undefined) return registeredNode;

        if (node.name === 'For') {
            // Ensure that the parameters are defined
            if (!node.params?.as) throw new Error(`For requires an "as" parameter`);
            if (!node.params?.each) throw new Error(`For requires an "each" parameter`);

            const each = evaluate(node.params.each, ctx);

            if (!Array.isArray(each)) return <Fragment key={index} />;
            return <For key={index} each={each} as={node.params.as} children={node.children ?? []} />;
        }

        if (node.name === 'Text') {
            if (!node.params?.value) return <Fragment key={index} />;

            const value = evaluate(node.params.value, ctx);
            if (typeof value !== 'string')
                throw new Error(`Text.value must evaluate to a string, but got ${typeof value}`);

            return <Text key={index} value={value} />;
        }

        if (node.name === 'Button') {
            const action = node.params?.action ? String(evaluate(node.params.action, ctx) ?? '') : '';
            const invalidateValue = node.params?.invalidate ? evaluate(node.params.invalidate, ctx) : [];
            const invalidate = Array.isArray(invalidateValue) ? (invalidateValue as string[]) : [];
            const json = node.params?.json ? compile(String(node.params.json)) : null;
            const method = node.params?.method ? String(evaluate(node.params.method, ctx) ?? 'POST') : 'POST';
            const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
            const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';
            const submitValue = node.params?.submit != null ? evaluate(node.params.submit, ctx) : undefined;
            const submit =
                submitValue === false || submitValue === 'false' ? false : submitValue != null ? true : false;

            return (
                <Button
                    key={index}
                    action={action}
                    invalidate={invalidate}
                    json={json}
                    method={method}
                    size={size}
                    variant={variant}
                    submit={submit}
                    children={node.children}
                />
            );
        }

        if (node.name === 'Input') {
            const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
            const placeholder = node.params?.placeholder
                ? (evaluate(node.params.placeholder, ctx) as string | number | boolean | undefined)
                : undefined;
            const value = node.params?.value
                ? (evaluate(node.params.value, ctx) as XmlBindableValue | undefined)
                : undefined;
            const type = node.params?.type ? String(evaluate(node.params.type, ctx) ?? 'text') : 'text';
            const autoComplete = node.params?.autoComplete
                ? String(evaluate(node.params.autoComplete, ctx) ?? '')
                : undefined;
            const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const ariaInvalidValue =
                node.params?.['aria-invalid'] != null ? evaluate(node.params['aria-invalid'], ctx) : undefined;
            const disabled =
                disabledValue === false || disabledValue === 'false' ? false : disabledValue != null ? true : undefined;
            const ariaInvalid =
                ariaInvalidValue === false || ariaInvalidValue === 'false'
                    ? false
                    : ariaInvalidValue != null
                      ? true
                      : undefined;

            return (
                <Input
                    key={index}
                    aria-invalid={ariaInvalid}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    id={id}
                    label={label}
                    placeholder={placeholder}
                    value={value}
                    type={type}
                />
            );
        }

        // InputGroupInput mirrors Input but keeps the specialized grouped styling.
        if (node.name === 'InputGroupInput') {
            const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
            const placeholder = node.params?.placeholder
                ? (evaluate(node.params.placeholder, ctx) as string | number | boolean | undefined)
                : undefined;
            const value = node.params?.value
                ? (evaluate(node.params.value, ctx) as XmlBindableValue | undefined)
                : undefined;
            const type = node.params?.type ? String(evaluate(node.params.type, ctx) ?? 'text') : 'text';
            const autoComplete = node.params?.autoComplete
                ? String(evaluate(node.params.autoComplete, ctx) ?? '')
                : undefined;
            const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const ariaInvalidValue =
                node.params?.['aria-invalid'] != null ? evaluate(node.params['aria-invalid'], ctx) : undefined;
            const disabled =
                disabledValue === false || disabledValue === 'false' ? false : disabledValue != null ? true : undefined;
            const ariaInvalid =
                ariaInvalidValue === false || ariaInvalidValue === 'false'
                    ? false
                    : ariaInvalidValue != null
                      ? true
                      : undefined;

            return (
                <InputGroupInput
                    key={index}
                    aria-invalid={ariaInvalid}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    id={id}
                    label={label}
                    placeholder={placeholder}
                    value={value}
                    type={type}
                />
            );
        }

        if (node.name === 'Textarea') {
            const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
            const placeholder = node.params?.placeholder
                ? (evaluate(node.params.placeholder, ctx) as string | number | boolean | undefined)
                : undefined;
            const value = node.params?.value
                ? (evaluate(node.params.value, ctx) as XmlBindableValue | undefined)
                : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
            const rowsValue = node.params?.rows != null ? evaluate(node.params.rows, ctx) : undefined;
            const colsValue = node.params?.cols != null ? evaluate(node.params.cols, ctx) : undefined;
            const disabled =
                disabledValue === true || disabledValue === 'true'
                    ? true
                    : disabledValue === false || disabledValue === 'false'
                      ? false
                      : undefined;

            return (
                <Textarea
                    key={index}
                    cols={colsValue == null ? undefined : String(colsValue)}
                    disabled={disabled}
                    id={id}
                    label={label}
                    placeholder={placeholder}
                    rows={rowsValue == null ? undefined : String(rowsValue)}
                    value={value}
                />
            );
        }

        // InputGroupTextarea mirrors Textarea but keeps the specialized grouped styling.
        if (node.name === 'InputGroupTextarea') {
            const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
            const placeholder = node.params?.placeholder
                ? (evaluate(node.params.placeholder, ctx) as string | number | boolean | undefined)
                : undefined;
            const value = node.params?.value
                ? (evaluate(node.params.value, ctx) as XmlBindableValue | undefined)
                : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
            const rowsValue = node.params?.rows != null ? evaluate(node.params.rows, ctx) : undefined;
            const colsValue = node.params?.cols != null ? evaluate(node.params.cols, ctx) : undefined;
            const disabled =
                disabledValue === true || disabledValue === 'true'
                    ? true
                    : disabledValue === false || disabledValue === 'false'
                      ? false
                      : undefined;

            return (
                <InputGroupTextarea
                    key={index}
                    cols={colsValue == null ? undefined : String(colsValue)}
                    disabled={disabled}
                    id={id}
                    label={label}
                    placeholder={placeholder}
                    rows={rowsValue == null ? undefined : String(rowsValue)}
                    value={value}
                />
            );
        }

        if (node.name === 'Checkbox') {
            const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
            const checkedValue = node.params?.checked != null ? evaluate(node.params.checked, ctx) : undefined;
            const defaultCheckedValue =
                node.params?.defaultChecked != null ? evaluate(node.params.defaultChecked, ctx) : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const checked =
                checkedValue && typeof checkedValue === 'object'
                    ? (checkedValue as Record<string, unknown>)
                    : undefined;
            const literalChecked =
                checkedValue === true || checkedValue === 'true'
                    ? true
                    : checkedValue === false || checkedValue === 'false'
                      ? false
                      : checkedValue != null
                        ? Boolean(checkedValue)
                        : undefined;
            const defaultChecked = checked
                ? undefined
                : literalChecked !== undefined
                  ? literalChecked
                  : defaultCheckedValue === true || defaultCheckedValue === 'true'
                    ? true
                    : defaultCheckedValue === false || defaultCheckedValue === 'false'
                      ? false
                      : defaultCheckedValue != null
                        ? Boolean(defaultCheckedValue)
                        : undefined;
            const disabled =
                disabledValue === true || disabledValue === 'true'
                    ? true
                    : disabledValue === false || disabledValue === 'false'
                      ? false
                      : undefined;

            return <Checkbox key={index} checked={checked} defaultChecked={defaultChecked} disabled={disabled} id={id} />;
        }

        if (node.name === 'Switch') {
            const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
            const checkedValue = node.params?.checked != null ? evaluate(node.params.checked, ctx) : undefined;
            const defaultCheckedValue =
                node.params?.defaultChecked != null ? evaluate(node.params.defaultChecked, ctx) : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
            const checked =
                checkedValue && typeof checkedValue === 'object'
                    ? (checkedValue as Record<string, unknown>)
                    : undefined;
            const literalChecked =
                checkedValue === true || checkedValue === 'true'
                    ? true
                    : checkedValue === false || checkedValue === 'false'
                      ? false
                      : checkedValue != null
                        ? Boolean(checkedValue)
                        : undefined;
            const defaultChecked = checked
                ? undefined
                : literalChecked !== undefined
                  ? literalChecked
                  : defaultCheckedValue === true || defaultCheckedValue === 'true'
                    ? true
                    : defaultCheckedValue === false || defaultCheckedValue === 'false'
                      ? false
                      : defaultCheckedValue != null
                        ? Boolean(defaultCheckedValue)
                        : undefined;
            const disabled =
                disabledValue === true || disabledValue === 'true'
                    ? true
                    : disabledValue === false || disabledValue === 'false'
                      ? false
                      : undefined;

            return (
                <Switch
                    key={index}
                    checked={checked}
                    defaultChecked={defaultChecked}
                    disabled={disabled}
                    id={id}
                    size={size as 'sm' | 'default'}
                />
            );
        }

        if (node.name === 'Slider') {
            const defaultValue =
                node.params?.defaultValue != null ? evaluate(node.params.defaultValue, ctx) : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
            const max = node.params?.max != null ? evaluate(node.params.max, ctx) : undefined;
            const min = node.params?.min != null ? evaluate(node.params.min, ctx) : undefined;
            const name = node.params?.name ? String(evaluate(node.params.name, ctx) ?? '') : undefined;
            const orientation = node.params?.orientation
                ? String(evaluate(node.params.orientation, ctx) ?? 'horizontal')
                : 'horizontal';
            const step = node.params?.step != null ? evaluate(node.params.step, ctx) : undefined;
            const value = node.params?.value != null ? evaluate(node.params.value, ctx) : undefined;
            const disabled =
                disabledValue === true || disabledValue === 'true'
                    ? true
                    : disabledValue === false || disabledValue === 'false'
                      ? false
                      : undefined;

            return (
                <Slider
                    key={index}
                    defaultValue={
                        defaultValue as number[] | number | string | boolean | Record<string, unknown> | undefined
                    }
                    disabled={disabled}
                    id={id}
                    max={max == null ? undefined : String(max)}
                    min={min == null ? undefined : String(min)}
                    name={name}
                    orientation={orientation as 'horizontal' | 'vertical'}
                    step={step == null ? undefined : String(step)}
                    value={value as number[] | number | string | boolean | Record<string, unknown> | undefined}
                />
            );
        }

        if (node.name === 'Toggle') {
            const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
            const pressedValue = node.params?.pressed != null ? evaluate(node.params.pressed, ctx) : undefined;
            const defaultPressedValue =
                node.params?.defaultPressed != null ? evaluate(node.params.defaultPressed, ctx) : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
            const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';
            const pressed =
                pressedValue && typeof pressedValue === 'object'
                    ? (pressedValue as Record<string, unknown>)
                    : undefined;
            const literalPressed =
                pressedValue === true || pressedValue === 'true'
                    ? true
                    : pressedValue === false || pressedValue === 'false'
                      ? false
                      : pressedValue != null
                        ? Boolean(pressedValue)
                        : undefined;
            const defaultPressed = pressed
                ? undefined
                : literalPressed !== undefined
                  ? literalPressed
                  : defaultPressedValue === true || defaultPressedValue === 'true'
                    ? true
                    : defaultPressedValue === false || defaultPressedValue === 'false'
                      ? false
                      : defaultPressedValue != null
                        ? Boolean(defaultPressedValue)
                        : undefined;
            const disabled =
                disabledValue === true || disabledValue === 'true'
                    ? true
                    : disabledValue === false || disabledValue === 'false'
                      ? false
                      : undefined;

            return (
                <Toggle
                    key={index}
                    defaultPressed={defaultPressed}
                    disabled={disabled}
                    id={id}
                    pressed={pressed}
                    size={size as 'sm' | 'default' | 'lg'}
                    variant={variant as 'default' | 'outline'}
                    children={node.children}
                />
            );
        }

        if (node.name === 'ToggleGroup') {
            const defaultValue =
                node.params?.defaultValue != null ? evaluate(node.params.defaultValue, ctx) : undefined;
            const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
            const loopFocusValue = node.params?.loopFocus != null ? evaluate(node.params.loopFocus, ctx) : undefined;
            const orientation = node.params?.orientation
                ? String(evaluate(node.params.orientation, ctx) ?? 'horizontal')
                : 'horizontal';
            const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
            const spacingValue = node.params?.spacing != null ? evaluate(node.params.spacing, ctx) : 0;
            const type = node.params?.type ? String(evaluate(node.params.type, ctx) ?? 'single') : 'single';
            const value = node.params?.value != null ? evaluate(node.params.value, ctx) : undefined;
            const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';
            const disabled =
                disabledValue === true || disabledValue === 'true'
                    ? true
                    : disabledValue === false || disabledValue === 'false'
                      ? false
                      : undefined;
            const loopFocus =
                loopFocusValue === true || loopFocusValue === 'true'
                    ? true
                    : loopFocusValue === false || loopFocusValue === 'false'
                      ? false
                      : undefined;
            const spacing = spacingValue == null ? undefined : Number(spacingValue);

            return (
                <ToggleGroup
                    key={index}
                    defaultValue={defaultValue as string | string[] | Record<string, unknown> | undefined}
                    disabled={disabled}
                    loopFocus={loopFocus}
                    orientation={orientation as 'horizontal' | 'vertical'}
                    size={size as 'sm' | 'default' | 'lg'}
                    spacing={Number.isNaN(spacing ?? NaN) ? undefined : spacing}
                    type={type as 'single' | 'multiple'}
                    value={value as string | string[] | Record<string, unknown> | undefined}
                    variant={variant as 'default' | 'outline'}
                    children={node.children}
                />
            );
        }

        if (node.name === 'ToggleGroupItem') {
            const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
            const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;
            const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

            return (
                <ToggleGroupItem
                    key={index}
                    size={size as 'sm' | 'default' | 'lg'}
                    value={value}
                    variant={variant as 'default' | 'outline'}
                    children={node.children}
                />
            );
        }

        throw new Error(`Unknown component "${node.name}"`);
    });
}

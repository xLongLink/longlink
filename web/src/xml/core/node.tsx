import { compile, evaluate, isText } from '@xml/core/expressions';
import { query } from '@xml/core/query';
import { state } from '@xml/core/state';
import { A } from '@xml/html/A';
import { B } from '@xml/html/B';
import { Br } from '@xml/html/Br';
import { Code } from '@xml/html/Code';
import { H1 } from '@xml/html/H1';
import { H2 } from '@xml/html/H2';
import { H3 } from '@xml/html/H3';
import { H4 } from '@xml/html/H4';
import { Li } from '@xml/html/Li';
import { Ol } from '@xml/html/Ol';
import { P } from '@xml/html/P';
import { S } from '@xml/html/S';
import { Sub } from '@xml/html/Sub';
import { Sup } from '@xml/html/Sup';
import { U } from '@xml/html/U';
import { Ul } from '@xml/html/Ul';
import { For } from '@xml/primitives/For';
import { Longlink } from '@xml/primitives/Longlink';
import { Text } from '@xml/primitives/Text';
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@xml/react/Avatar';
import { Badge } from '@xml/react/Badge';
import { Button } from '@xml/react/Button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@xml/react/ButtonGroup';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@xml/react/Card';
import { Checkbox } from '@xml/react/Checkbox';
import { Column, Columns } from '@xml/react/Columns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@xml/react/Dialog';
import { Divider } from '@xml/react/Divider';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldTitle,
} from '@xml/react/Field';
import { Grid } from '@xml/react/Grid';
import { Hero, HeroContent, HeroDescription, HeroTitle } from '@xml/react/Hero';
import { Icon } from '@xml/react/Icon';
import { Input } from '@xml/react/Input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    type InputGroupButtonProps,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
} from '@xml/react/InputGroup';
import { Label } from '@xml/react/Label';
import { RadioGroup, RadioGroupItem } from '@xml/react/RadioGroup';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@xml/react/Select';
import { Slider } from '@xml/react/Slider';
import { Stack } from '@xml/react/Stack';
import { Switch } from '@xml/react/Switch';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@xml/react/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@xml/react/Tabs';
import { Textarea } from '@xml/react/Textarea';
import { Toggle } from '@xml/react/Toggle';
import { ToggleGroup, ToggleGroupItem } from '@xml/react/ToggleGroup';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@xml/react/Tooltip';
import type { ASTNode, ExecutionContext } from '@xml/types';
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

        if (node.name === 'State') {
            if (!node.params?.id) throw new Error('State requires a string id');
            if (node.params.value == null) throw new Error('State requires a value');
            if (!isText(node.params.id)) throw new Error('State id must be literal text');
            if ((node.children ?? []).length > 0) throw new Error('State cannot have children');

            state(ctx, node.params.id.trim(), evaluate(node.params.value, ctx));

            return <Fragment key={index} />;
        }

        if (node.name === 'Query') {
            if (!node.params?.id) throw new Error('Query requires a string id');
            if (!node.params?.path) throw new Error('Query requires a string path');
            if ((node.children ?? []).length > 0) throw new Error('Query cannot have children');
            if (!isText(node.params.id)) throw new Error('Query id must be literal text');
            if (!isText(node.params.path)) throw new Error('Query path must be literal text');

            query(ctx, node.params.id.trim(), node.params.path.trim(), '');

            return <Fragment key={index} />;
        }

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
            if (typeof value !== 'string') throw new Error(`Text.value must evaluate to a string, but got ${typeof value}`);

            return <Text key={index} value={value} />;
        }

        if (node.name === 'longlink') {
            return <Longlink key={index} children={node.children ?? []} />;
        }

        if (node.name === 'Divider') {
            return <Divider key={index} />;
        }

        if (node.name === 'Icon') {
            const name = node.params?.name ? String(evaluate(node.params.name, ctx) ?? '') : '';

            return <Icon key={index} name={name} />;
        }

        if (node.name === 'Tabs') {
            const defaultValue = node.params?.defaultValue
                ? String(evaluate(node.params.defaultValue, ctx) ?? '')
                : undefined;
            const orientation = node.params?.orientation
                ? String(evaluate(node.params.orientation, ctx) ?? 'horizontal')
                : 'horizontal';

            return <Tabs key={index} defaultValue={defaultValue} orientation={orientation} children={node.children} />;
        }

        if (node.name === 'TabsList') {
            const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

            return <TabsList key={index} variant={variant} children={node.children} />;
        }

        if (node.name === 'TabsTrigger') {
            const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;

            return <TabsTrigger key={index} value={value} children={node.children} />;
        }

        if (node.name === 'TabsContent') {
            const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;

            return <TabsContent key={index} value={value} children={node.children} />;
        }

        if (node.name === 'Hero') {
            const icon = node.params?.icon ? String(node.params.icon) : undefined;

            return <Hero key={index} icon={icon} children={node.children} />;
        }

        if (node.name === 'HeroTitle') {
            return <HeroTitle key={index} children={node.children} />;
        }

        if (node.name === 'HeroDescription') {
            return <HeroDescription key={index} children={node.children} />;
        }

        if (node.name === 'HeroContent') {
            return <HeroContent key={index} children={node.children} />;
        }

        if (node.name === 'P') {
            return <P key={index} children={node.children} />;
        }

        if (node.name === 'Br') {
            return <Br key={index} />;
        }

        if (node.name === 'B') {
            return <B key={index} children={node.children} />;
        }

        if (node.name === 'H1') {
            return <H1 key={index} children={node.children} />;
        }

        if (node.name === 'H2') {
            return <H2 key={index} children={node.children} />;
        }

        if (node.name === 'H3') {
            return <H3 key={index} children={node.children} />;
        }

        if (node.name === 'H4') {
            return <H4 key={index} children={node.children} />;
        }

        if (node.name === 'Code') {
            return <Code key={index} children={node.children} />;
        }

        if (node.name === 'S') {
            return <S key={index} children={node.children} />;
        }

        if (node.name === 'Sup') {
            return <Sup key={index} children={node.children} />;
        }

        if (node.name === 'Sub') {
            return <Sub key={index} children={node.children} />;
        }

        if (node.name === 'U') {
            return <U key={index} children={node.children} />;
        }

        if (node.name === 'Ul') {
            return <Ul key={index} children={node.children} />;
        }

    if (node.name === 'Li') {
        return <Li children={node.children} />;
    }

    if (node.name === 'Ol') {
        return <Ol children={node.children} />;
    }

    if (node.name === 'A') {
        const href = node.params?.href ? String(evaluate(node.params.href, ctx) ?? '') : '';
        return <A href={href} children={node.children} />;
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
        const submit = submitValue === false || submitValue === 'false' ? false : submitValue != null ? true : false;

        return (
            <Button
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

    if (node.name === 'ButtonGroup') {
        const orientation = node.params?.orientation
            ? String(evaluate(node.params.orientation, ctx) ?? 'horizontal')
            : 'horizontal';

        return <ButtonGroup orientation={orientation as 'horizontal' | 'vertical'} children={node.children} />;
    }

    if (node.name === 'ButtonGroupText') {
        return <ButtonGroupText children={node.children} />;
    }

    if (node.name === 'ButtonGroupSeparator') {
        const orientation = node.params?.orientation
            ? String(evaluate(node.params.orientation, ctx) ?? 'vertical')
            : 'vertical';

        return <ButtonGroupSeparator orientation={orientation as 'horizontal' | 'vertical'} />;
    }

    // Input group tags reuse the shared input-group chrome from the UI layer.
    if (node.name === 'InputGroup') {
        return <InputGroup children={node.children} />;
    }

    if (node.name === 'InputGroupAddon') {
        const align = node.params?.align ? String(evaluate(node.params.align, ctx) ?? 'inline-start') : 'inline-start';

        return (
            <InputGroupAddon
                align={align as 'inline-start' | 'inline-end' | 'block-start' | 'block-end'}
                children={node.children}
            />
        );
    }

    // Normalize button props before rendering the grouped button shell.
    if (node.name === 'InputGroupButton') {
        const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
        const disabled =
            disabledValue === true || disabledValue === 'true'
                ? true
                : disabledValue === false || disabledValue === 'false'
                  ? false
                  : undefined;
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'xs') : 'xs';
        const type = node.params?.type ? String(evaluate(node.params.type, ctx) ?? 'button') : 'button';
        const variant = (
            node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'ghost') : 'ghost'
        ) as InputGroupButtonProps['variant'];

        return (
            <InputGroupButton
                disabled={disabled}
                size={size as 'xs' | 'sm' | 'icon-xs' | 'icon-sm'}
                type={type as 'button' | 'submit' | 'reset'}
                variant={variant}
                children={node.children}
            />
        );
    }

    if (node.name === 'InputGroupText') {
        return <InputGroupText children={node.children} />;
    }

    if (node.name === 'Badge') {
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

        return <Badge variant={variant} children={node.children} />;
    }

    if (node.name === 'Avatar') {
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';

        return <Avatar size={size} children={node.children} />;
    }

    if (node.name === 'AvatarImage') {
        const alt = node.params?.alt ? String(evaluate(node.params.alt, ctx) ?? '') : undefined;
        const src = node.params?.src ? String(evaluate(node.params.src, ctx) ?? '') : undefined;

        return <AvatarImage alt={alt} src={src} />;
    }

    if (node.name === 'AvatarFallback') {
        return <AvatarFallback children={node.children} />;
    }

    if (node.name === 'AvatarBadge') {
        return <AvatarBadge children={node.children} />;
    }

    if (node.name === 'AvatarGroup') {
        return <AvatarGroup children={node.children} />;
    }

    if (node.name === 'AvatarGroupCount') {
        return <AvatarGroupCount children={node.children} />;
    }

    if (node.name === 'Columns') {
        return <Columns children={node.children} />;
    }

    if (node.name === 'Column') {
        const width = node.params?.width ? evaluate(node.params.width, ctx) : undefined;

        return <Column width={width == null ? undefined : String(width)} children={node.children} />;
    }

    if (node.name === 'Grid') {
        const columns = node.params?.columns != null ? evaluate(node.params.columns, ctx) : undefined;

        return <Grid columns={columns == null ? undefined : String(columns)} children={node.children} />;
    }

    if (node.name === 'Stack') {
        return <Stack children={node.children} />;
    }

    if (node.name === 'Card') {
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';

        return <Card size={size} children={node.children} />;
    }

    if (node.name === 'CardHeader') {
        return <CardHeader children={node.children} />;
    }

    if (node.name === 'CardTitle') {
        return <CardTitle children={node.children} />;
    }

    if (node.name === 'CardDescription') {
        return <CardDescription children={node.children} />;
    }

    if (node.name === 'CardAction') {
        return <CardAction children={node.children} />;
    }

    if (node.name === 'CardContent') {
        return <CardContent children={node.children} />;
    }

    if (node.name === 'CardFooter') {
        return <CardFooter children={node.children} />;
    }

    if (node.name === 'Dialog') {
        const openValue = node.params?.open ? evaluate(node.params.open, ctx) : undefined;
        const defaultOpenValue = node.params?.defaultOpen ? evaluate(node.params.defaultOpen, ctx) : undefined;
        const open =
            openValue === true || openValue === 'true'
                ? true
                : openValue === false || openValue === 'false'
                  ? false
                  : undefined;
        const defaultOpen =
            defaultOpenValue === true || defaultOpenValue === 'true'
                ? true
                : defaultOpenValue === false || defaultOpenValue === 'false'
                  ? false
                  : undefined;

        return <Dialog defaultOpen={defaultOpen} open={open} children={node.children} />;
    }

    if (node.name === 'DialogTrigger') {
        return <DialogTrigger children={node.children} />;
    }

    if (node.name === 'DialogContent') {
        return <DialogContent children={node.children} />;
    }

    if (node.name === 'DialogHeader') {
        return <DialogHeader children={node.children} />;
    }

    if (node.name === 'DialogTitle') {
        return <DialogTitle children={node.children} />;
    }

    if (node.name === 'DialogDescription') {
        return <DialogDescription children={node.children} />;
    }

    if (node.name === 'DialogFooter') {
        return <DialogFooter children={node.children} />;
    }

    if (node.name === 'TooltipProvider') {
        return <TooltipProvider children={node.children} />;
    }

    if (node.name === 'Tooltip') {
        const openValue = node.params?.open ? evaluate(node.params.open, ctx) : undefined;
        const defaultOpenValue = node.params?.defaultOpen ? evaluate(node.params.defaultOpen, ctx) : undefined;
        const open =
            openValue === true || openValue === 'true'
                ? true
                : openValue === false || openValue === 'false'
                  ? false
                  : undefined;
        const defaultOpen =
            defaultOpenValue === true || defaultOpenValue === 'true'
                ? true
                : defaultOpenValue === false || defaultOpenValue === 'false'
                  ? false
                  : undefined;

        return <Tooltip defaultOpen={defaultOpen} open={open} children={node.children} />;
    }

    if (node.name === 'TooltipTrigger') {
        return <TooltipTrigger children={node.children} />;
    }

    if (node.name === 'TooltipContent') {
        const align = node.params?.align ? String(evaluate(node.params.align, ctx) ?? 'center') : 'center';
        const alignOffset = node.params?.alignOffset != null ? evaluate(node.params.alignOffset, ctx) : 0;
        const hiddenValue = node.params?.hidden != null ? evaluate(node.params.hidden, ctx) : undefined;
        const side = node.params?.side ? String(evaluate(node.params.side, ctx) ?? 'top') : 'top';
        const sideOffset = node.params?.sideOffset != null ? evaluate(node.params.sideOffset, ctx) : 4;

        return (
            <TooltipContent
                align={align}
                alignOffset={alignOffset == null ? undefined : String(alignOffset)}
                hidden={
                    hiddenValue === true || hiddenValue === 'true'
                        ? true
                        : hiddenValue === false || hiddenValue === 'false'
                          ? false
                          : undefined
                }
                side={side}
                sideOffset={sideOffset == null ? undefined : String(sideOffset)}
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
            ? (evaluate(node.params.value, ctx) as string | number | boolean | undefined)
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
            ? (evaluate(node.params.value, ctx) as string | number | boolean | undefined)
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
            ? (evaluate(node.params.value, ctx) as string | number | boolean | undefined)
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
            ? (evaluate(node.params.value, ctx) as string | number | boolean | undefined)
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

    if (node.name === 'FieldSet') {
        return <FieldSet children={node.children} />;
    }

    if (node.name === 'FieldLegend') {
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'legend') : 'legend';

        return <FieldLegend variant={variant as 'legend' | 'label'} children={node.children} />;
    }

    if (node.name === 'FieldGroup') {
        return <FieldGroup children={node.children} />;
    }

    if (node.name === 'Field') {
        const orientation = node.params?.orientation
            ? String(evaluate(node.params.orientation, ctx) ?? 'vertical')
            : 'vertical';

        return <Field orientation={orientation as 'vertical' | 'horizontal' | 'responsive'} children={node.children} />;
    }

    if (node.name === 'FieldContent') {
        return <FieldContent children={node.children} />;
    }

    if (node.name === 'FieldLabel') {
        const htmlFor = node.params?.htmlFor ? String(evaluate(node.params.htmlFor, ctx) ?? '') : undefined;

        return <FieldLabel htmlFor={htmlFor} children={node.children} />;
    }

    if (node.name === 'FieldTitle') {
        return <FieldTitle children={node.children} />;
    }

    if (node.name === 'FieldDescription') {
        return <FieldDescription children={node.children} />;
    }

    if (node.name === 'FieldSeparator') {
        return <FieldSeparator children={node.children} />;
    }

    if (node.name === 'FieldError') {
        const errors = node.params?.errors != null ? evaluate(node.params.errors, ctx) : undefined;

        return (
            <FieldError
                errors={errors as Array<{ message?: string } | undefined> | string | undefined}
                children={node.children}
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
            checkedValue && typeof checkedValue === 'object' ? (checkedValue as Record<string, unknown>) : undefined;
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

        return <Checkbox checked={checked} defaultChecked={defaultChecked} disabled={disabled} id={id} />;
    }

    if (node.name === 'RadioGroup') {
        const defaultValueValue =
            node.params?.defaultValue != null ? evaluate(node.params.defaultValue, ctx) : undefined;
        const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
        const form = node.params?.form ? String(evaluate(node.params.form, ctx) ?? '') : undefined;
        const name = node.params?.name ? String(evaluate(node.params.name, ctx) ?? '') : undefined;
        const readOnlyValue = node.params?.readOnly != null ? evaluate(node.params.readOnly, ctx) : undefined;
        const requiredValue = node.params?.required != null ? evaluate(node.params.required, ctx) : undefined;
        const valueValue = node.params?.value != null ? evaluate(node.params.value, ctx) : undefined;
        const disabled =
            disabledValue === true || disabledValue === 'true'
                ? true
                : disabledValue === false || disabledValue === 'false'
                  ? false
                  : undefined;
        const readOnly =
            readOnlyValue === true || readOnlyValue === 'true'
                ? true
                : readOnlyValue === false || readOnlyValue === 'false'
                  ? false
                  : undefined;
        const required =
            requiredValue === true || requiredValue === 'true'
                ? true
                : requiredValue === false || requiredValue === 'false'
                  ? false
                  : undefined;

        return (
            <RadioGroup
                defaultValue={defaultValueValue as string | Record<string, unknown> | undefined}
                disabled={disabled}
                form={form}
                name={name}
                readOnly={readOnly}
                required={required}
                value={valueValue as string | Record<string, unknown> | undefined}
                children={node.children}
            />
        );
    }

    if (node.name === 'RadioGroupItem') {
        const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
        const readOnlyValue = node.params?.readOnly != null ? evaluate(node.params.readOnly, ctx) : undefined;
        const requiredValue = node.params?.required != null ? evaluate(node.params.required, ctx) : undefined;
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;
        const disabled =
            disabledValue === true || disabledValue === 'true'
                ? true
                : disabledValue === false || disabledValue === 'false'
                  ? false
                  : undefined;
        const readOnly =
            readOnlyValue === true || readOnlyValue === 'true'
                ? true
                : readOnlyValue === false || readOnlyValue === 'false'
                  ? false
                  : undefined;
        const required =
            requiredValue === true || requiredValue === 'true'
                ? true
                : requiredValue === false || requiredValue === 'false'
                  ? false
                  : undefined;

        return (
            <RadioGroupItem
                disabled={disabled}
                readOnly={readOnly}
                required={required}
                value={value}
                children={node.children}
            />
        );
    }

    if (node.name === 'Label') {
        const htmlFor = node.params?.htmlFor ? String(evaluate(node.params.htmlFor, ctx) ?? '') : undefined;

        return <Label htmlFor={htmlFor} children={node.children} />;
    }

    if (node.name === 'Switch') {
        const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
        const checkedValue = node.params?.checked != null ? evaluate(node.params.checked, ctx) : undefined;
        const defaultCheckedValue =
            node.params?.defaultChecked != null ? evaluate(node.params.defaultChecked, ctx) : undefined;
        const disabledValue = node.params?.disabled != null ? evaluate(node.params.disabled, ctx) : undefined;
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
        const checked =
            checkedValue && typeof checkedValue === 'object' ? (checkedValue as Record<string, unknown>) : undefined;
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
                checked={checked}
                defaultChecked={defaultChecked}
                disabled={disabled}
                id={id}
                size={size as 'sm' | 'default'}
            />
        );
    }

    if (node.name === 'Slider') {
        const defaultValue = node.params?.defaultValue != null ? evaluate(node.params.defaultValue, ctx) : undefined;
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
            pressedValue && typeof pressedValue === 'object' ? (pressedValue as Record<string, unknown>) : undefined;
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
        const defaultValue = node.params?.defaultValue != null ? evaluate(node.params.defaultValue, ctx) : undefined;
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
                size={size as 'sm' | 'default' | 'lg'}
                value={value}
                variant={variant as 'default' | 'outline'}
                children={node.children}
            />
        );
    }

    if (node.name === 'Select') {
        const defaultOpenValue = node.params?.defaultOpen ? evaluate(node.params.defaultOpen, ctx) : undefined;
        const openValue = node.params?.open ? evaluate(node.params.open, ctx) : undefined;
        const defaultOpen =
            defaultOpenValue === true || defaultOpenValue === 'true'
                ? true
                : defaultOpenValue === false || defaultOpenValue === 'false'
                  ? false
                  : undefined;
        const open =
            openValue === true || openValue === 'true'
                ? true
                : openValue === false || openValue === 'false'
                  ? false
                  : undefined;
        const defaultValue = node.params?.defaultValue
            ? String(evaluate(node.params.defaultValue, ctx) ?? '')
            : undefined;
        const value = node.params?.value ? evaluate(node.params.value, ctx) : undefined;

        return (
            <Select
                defaultOpen={defaultOpen}
                defaultValue={defaultValue}
                open={open}
                value={value as never}
                children={node.children}
            />
        );
    }

    if (node.name === 'SelectTrigger') {
        return <SelectTrigger children={node.children} />;
    }

    if (node.name === 'SelectValue') {
        const placeholder = node.params?.placeholder ? String(evaluate(node.params.placeholder, ctx) ?? '') : undefined;

        return <SelectValue placeholder={placeholder} />;
    }

    if (node.name === 'SelectContent') {
        return <SelectContent children={node.children} />;
    }

    if (node.name === 'SelectGroup') {
        return <SelectGroup children={node.children} />;
    }

    if (node.name === 'SelectLabel') {
        return <SelectLabel children={node.children} />;
    }

    if (node.name === 'SelectItem') {
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;

        return <SelectItem value={value} children={node.children} />;
    }

    if (node.name === 'SelectSeparator') {
        return <SelectSeparator />;
    }

    if (node.name === 'Table') {
        return <Table children={node.children} />;
    }

    if (node.name === 'TableHeader') {
        return <TableHeader children={node.children} />;
    }

    if (node.name === 'TableBody') {
        return <TableBody children={node.children} />;
    }

    if (node.name === 'TableFooter') {
        return <TableFooter children={node.children} />;
    }

    if (node.name === 'TableRow') {
        return <TableRow children={node.children} />;
    }

    if (node.name === 'TableHead') {
        return <TableHead children={node.children} />;
    }

    if (node.name === 'TableCell') {
        return <TableCell children={node.children} />;
    }

    throw new Error(`Unknown component "${node.name}"`);
    });
}

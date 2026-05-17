import { ContextProvider } from '@xml/core/context';
import { compile, evaluate, isText } from '@xml/core/expressions';
import { state } from '@xml/core/state';
import { A } from '@xml/html/A';
import { B } from '@xml/html/B';
import { Code } from '@xml/html/Code';
import { H1 } from '@xml/html/H1';
import { H2 } from '@xml/html/H2';
import { H3 } from '@xml/html/H3';
import { H4 } from '@xml/html/H4';
import { Hr } from '@xml/html/Hr';
import { Li } from '@xml/html/Li';
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
import { Hero, HeroContent, HeroDescription, HeroTitle } from '@xml/react/Hero';
import { Icon } from '@xml/react/Icon';
import { Input } from '@xml/react/Input';
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
import { Switch } from '@xml/react/Switch';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@xml/react/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@xml/react/Tabs';
import { Textarea } from '@xml/react/Textarea';
import { Toggle } from '@xml/react/Toggle';
import { ToggleGroup, ToggleGroupItem } from '@xml/react/ToggleGroup';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@xml/react/Tooltip';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { Fragment, type ReactNode } from 'react';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(node: ASTNode | ASTNode[] | null, ctx: ExecutionContext): ReactNode {
    // Handle null/undefined early to avoid unnecessary component resolution and error boundaries.
    if (!node) return null;

    // Handle arrays of nodes as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, ctx)}</Fragment>);
    }

    // Handle conditional rendering with "if" parameter.
    if (node.params?.if != null) {
        if (!evaluate(node.params.if, ctx)) {
            return <></>;
        }
    }

    // State nodes seed a scoped child context so descendants can resolve initial values immediately.
    if (node.name === 'State') {
        if (!node.params?.id) throw new Error('State requires a string id');
        if (node.params.value == null) throw new Error('State requires a value');
        if (!isText(node.params.id)) throw new Error('State id must be literal text');

        const childCtx: ExecutionContext = {
            parent: ctx,
            setups: ctx.setups,
            invalidate: ctx.invalidate,
            values: { ...ctx.values },
        };

        state(childCtx, node.params.id.trim(), evaluate(node.params.value, ctx));

        return node.children ? (
            <ContextProvider value={childCtx}>{renderNode(node.children, childCtx)}</ContextProvider>
        ) : (
            <></>
        );
    }

    // Query nodes are validated here and resolved by the runtime setup pass.
    if (node.name === 'Query') {
        if (!node.params?.id) throw new Error('Query requires a string id');
        if (!node.params?.path) throw new Error('Query requires a string path');

        return node.children ? renderNode(node.children, ctx) : <></>;
    }

    if (node.name === 'For') {
        // Ensure that the parameters are defined
        if (!node.params?.as) throw new Error(`For requires an "as" parameter`);
        if (!node.params?.each) throw new Error(`For requires an "each" parameter`);

        // If there are no children, there's nothing to render, so we can skip the "For" component entirely.
        if (!node.children) return <></>;

        const each = evaluate(node.params.each, ctx);

        if (!Array.isArray(each)) return <></>;
        return <For each={each} as={node.params.as} children={node.children} />;
    }

    if (node.name === 'Text') {
        if (!node.params?.value) return <></>;

        const value = evaluate(node.params.value, ctx);
        if (typeof value !== 'string') throw new Error(`Text.value must evaluate to a string, but got ${typeof value}`);

        return <Text value={value} />;
    }

    if (node.name === 'longlink') {
        return <Longlink children={node.children} />;
    }

    if (node.name === 'Divider') {
        return <Divider />;
    }

    if (node.name === 'Icon') {
        const name = node.params?.name ? String(evaluate(node.params.name, ctx) ?? '') : '';
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Icon className={className} name={name} />;
    }

    if (node.name === 'Tabs') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const defaultValue = node.params?.defaultValue
            ? String(evaluate(node.params.defaultValue, ctx) ?? '')
            : undefined;
        const orientation = node.params?.orientation
            ? String(evaluate(node.params.orientation, ctx) ?? 'horizontal')
            : 'horizontal';

        return (
            <Tabs
                className={className}
                defaultValue={defaultValue}
                orientation={orientation}
                children={node.children}
            />
        );
    }

    if (node.name === 'TabsList') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

        return <TabsList className={className} variant={variant} children={node.children} />;
    }

    if (node.name === 'TabsTrigger') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;

        return <TabsTrigger className={className} value={value} children={node.children} />;
    }

    if (node.name === 'TabsContent') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;

        return <TabsContent className={className} value={value} children={node.children} />;
    }

    if (node.name === 'Hero') {
        const icon = node.params?.icon ? String(node.params.icon) : undefined;

        return <Hero icon={icon} children={node.children} />;
    }

    if (node.name === 'HeroTitle') {
        return <HeroTitle children={node.children} />;
    }

    if (node.name === 'HeroDescription') {
        return <HeroDescription children={node.children} />;
    }

    if (node.name === 'HeroContent') {
        return <HeroContent children={node.children} />;
    }

    if (node.name === 'p') {
        return <P children={node.children} />;
    }

    if (node.name === 'hr') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Hr className={className} />;
    }

    if (node.name === 'b') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <B className={className} children={node.children} />;
    }

    if (node.name === 'h1') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <H1 className={className} children={node.children} />;
    }

    if (node.name === 'h2') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <H2 className={className} children={node.children} />;
    }

    if (node.name === 'h3') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <H3 className={className} children={node.children} />;
    }

    if (node.name === 'h4') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <H4 className={className} children={node.children} />;
    }

    if (node.name === 'code') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Code className={className} children={node.children} />;
    }

    if (node.name === 's') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <S className={className} children={node.children} />;
    }

    if (node.name === 'sup') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Sup className={className} children={node.children} />;
    }

    if (node.name === 'sub') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Sub className={className} children={node.children} />;
    }

    if (node.name === 'u') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <U className={className} children={node.children} />;
    }

    if (node.name === 'ul') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Ul className={className} children={node.children} />;
    }

    if (node.name === 'li') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Li className={className} children={node.children} />;
    }

    if (node.name === 'a') {
        const href = node.params?.href ? String(evaluate(node.params.href, ctx) ?? '') : '';
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <A className={className} href={href} children={node.children} />;
    }

    if (node.name === 'Button') {
        const action = node.params?.action ? String(evaluate(node.params.action, ctx) ?? '') : '';
        const invalidateValue = node.params?.invalidate ? evaluate(node.params.invalidate, ctx) : [];
        const invalidate = Array.isArray(invalidateValue) ? (invalidateValue as string[]) : [];
        const json = node.params?.json ? compile(String(node.params.json)) : null;
        const method = node.params?.method ? String(evaluate(node.params.method, ctx) ?? 'POST') : 'POST';
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

        return (
            <Button
                action={action}
                invalidate={invalidate}
                json={json}
                method={method}
                size={size}
                variant={variant}
                children={node.children}
            />
        );
    }

    if (node.name === 'ButtonGroup') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const orientation = node.params?.orientation
            ? String(evaluate(node.params.orientation, ctx) ?? 'horizontal')
            : 'horizontal';

        return (
            <ButtonGroup
                className={className}
                orientation={orientation as 'horizontal' | 'vertical'}
                children={node.children}
            />
        );
    }

    if (node.name === 'ButtonGroupText') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <ButtonGroupText className={className} children={node.children} />;
    }

    if (node.name === 'ButtonGroupSeparator') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const orientation = node.params?.orientation
            ? String(evaluate(node.params.orientation, ctx) ?? 'vertical')
            : 'vertical';

        return <ButtonGroupSeparator className={className} orientation={orientation as 'horizontal' | 'vertical'} />;
    }

    if (node.name === 'Badge') {
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

        return <Badge variant={variant} children={node.children} />;
    }

    if (node.name === 'Avatar') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';

        return <Avatar className={className} size={size} children={node.children} />;
    }

    if (node.name === 'AvatarImage') {
        const alt = node.params?.alt ? String(evaluate(node.params.alt, ctx) ?? '') : undefined;
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const src = node.params?.src ? String(evaluate(node.params.src, ctx) ?? '') : undefined;

        return <AvatarImage alt={alt} className={className} src={src} />;
    }

    if (node.name === 'AvatarFallback') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <AvatarFallback className={className} children={node.children} />;
    }

    if (node.name === 'AvatarBadge') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <AvatarBadge className={className} children={node.children} />;
    }

    if (node.name === 'AvatarGroup') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <AvatarGroup className={className} children={node.children} />;
    }

    if (node.name === 'AvatarGroupCount') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <AvatarGroupCount className={className} children={node.children} />;
    }

    if (node.name === 'Columns') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Columns className={className} children={node.children} />;
    }

    if (node.name === 'Column') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const width = node.params?.width ? evaluate(node.params.width, ctx) : undefined;

        return (
            <Column className={className} width={width == null ? undefined : String(width)} children={node.children} />
        );
    }

    if (node.name === 'Card') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';

        return <Card className={className} size={size} children={node.children} />;
    }

    if (node.name === 'CardHeader') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardHeader className={className} children={node.children} />;
    }

    if (node.name === 'CardTitle') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardTitle className={className} children={node.children} />;
    }

    if (node.name === 'CardDescription') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardDescription className={className} children={node.children} />;
    }

    if (node.name === 'CardAction') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardAction className={className} children={node.children} />;
    }

    if (node.name === 'CardContent') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardContent className={className} children={node.children} />;
    }

    if (node.name === 'CardFooter') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardFooter className={className} children={node.children} />;
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const hiddenValue = node.params?.hidden != null ? evaluate(node.params.hidden, ctx) : undefined;
        const side = node.params?.side ? String(evaluate(node.params.side, ctx) ?? 'top') : 'top';
        const sideOffset = node.params?.sideOffset != null ? evaluate(node.params.sideOffset, ctx) : 4;

        return (
            <TooltipContent
                align={align}
                alignOffset={alignOffset == null ? undefined : String(alignOffset)}
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <FieldSet className={className} children={node.children} />;
    }

    if (node.name === 'FieldLegend') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'legend') : 'legend';

        return <FieldLegend className={className} variant={variant as 'legend' | 'label'} children={node.children} />;
    }

    if (node.name === 'FieldGroup') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <FieldGroup className={className} children={node.children} />;
    }

    if (node.name === 'Field') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const orientation = node.params?.orientation
            ? String(evaluate(node.params.orientation, ctx) ?? 'vertical')
            : 'vertical';

        return (
            <Field
                className={className}
                orientation={orientation as 'vertical' | 'horizontal' | 'responsive'}
                children={node.children}
            />
        );
    }

    if (node.name === 'FieldContent') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <FieldContent className={className} children={node.children} />;
    }

    if (node.name === 'FieldLabel') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const htmlFor = node.params?.htmlFor ? String(evaluate(node.params.htmlFor, ctx) ?? '') : undefined;

        return <FieldLabel className={className} htmlFor={htmlFor} children={node.children} />;
    }

    if (node.name === 'FieldTitle') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <FieldTitle className={className} children={node.children} />;
    }

    if (node.name === 'FieldDescription') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <FieldDescription className={className} children={node.children} />;
    }

    if (node.name === 'FieldSeparator') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <FieldSeparator className={className} children={node.children} />;
    }

    if (node.name === 'FieldError') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const errors = node.params?.errors != null ? evaluate(node.params.errors, ctx) : undefined;

        return (
            <FieldError
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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

        return (
            <Checkbox
                checked={checked}
                className={className}
                defaultChecked={defaultChecked}
                disabled={disabled}
                id={id}
            />
        );
    }

    if (node.name === 'RadioGroup') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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
                className={className}
                disabled={disabled}
                readOnly={readOnly}
                required={required}
                value={value}
                children={node.children}
            />
        );
    }

    if (node.name === 'Label') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const htmlFor = node.params?.htmlFor ? String(evaluate(node.params.htmlFor, ctx) ?? '') : undefined;

        return <Label className={className} htmlFor={htmlFor} children={node.children} />;
    }

    if (node.name === 'Switch') {
        const id = node.params?.id ? String(evaluate(node.params.id, ctx) ?? '') : undefined;
        const checkedValue = node.params?.checked != null ? evaluate(node.params.checked, ctx) : undefined;
        const defaultCheckedValue =
            node.params?.defaultChecked != null ? evaluate(node.params.defaultChecked, ctx) : undefined;
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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
                className={className}
                defaultChecked={defaultChecked}
                disabled={disabled}
                id={id}
                size={size as 'sm' | 'default'}
            />
        );
    }

    if (node.name === 'Slider') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
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
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

        return (
            <ToggleGroupItem
                className={className}
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
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <SelectTrigger className={className} children={node.children} />;
    }

    if (node.name === 'SelectValue') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const placeholder = node.params?.placeholder ? String(evaluate(node.params.placeholder, ctx) ?? '') : undefined;

        return <SelectValue className={className} placeholder={placeholder} />;
    }

    if (node.name === 'SelectContent') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <SelectContent className={className} children={node.children} />;
    }

    if (node.name === 'SelectGroup') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <SelectGroup className={className} children={node.children} />;
    }

    if (node.name === 'SelectLabel') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <SelectLabel className={className} children={node.children} />;
    }

    if (node.name === 'SelectItem') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;

        return <SelectItem className={className} value={value} children={node.children} />;
    }

    if (node.name === 'SelectSeparator') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <SelectSeparator className={className} />;
    }

    if (node.name === 'Table') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <Table className={className} children={node.children} />;
    }

    if (node.name === 'TableHeader') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <TableHeader className={className} children={node.children} />;
    }

    if (node.name === 'TableBody') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <TableBody className={className} children={node.children} />;
    }

    if (node.name === 'TableFooter') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <TableFooter className={className} children={node.children} />;
    }

    if (node.name === 'TableRow') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <TableRow className={className} children={node.children} />;
    }

    if (node.name === 'TableHead') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <TableHead className={className} children={node.children} />;
    }

    if (node.name === 'TableCell') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <TableCell className={className} children={node.children} />;
    }

    if (node.name === 'TableCaption') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <TableCaption className={className} children={node.children} />;
    }

    throw new Error(`Unknown component "${node.name}"`);
}

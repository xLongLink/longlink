import { evaluate } from '@xml/core/expressions';
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
import { Longlink } from '@xml/primitives/Longlink';
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@xml/react/Avatar';
import { Badge } from '@xml/react/Badge';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@xml/react/ButtonGroup';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@xml/react/Card';
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
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText } from '@xml/react/InputGroup';
import { Label } from '@xml/react/Label';
import { Menu, MenuContent, MenuList, MenuSection, MenuSubSection } from '@xml/react/Menu';
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
import { Stack } from '@xml/react/Stack';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@xml/react/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@xml/react/Tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@xml/react/Tooltip';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { Fragment, type ComponentType, type Key, type ReactNode } from 'react';

type XmlPropKind = 'boolean' | 'enum' | 'string' | 'value';

type XmlPropDefinition = {
    kind: XmlPropKind;
    defaultValue?: unknown;
    enumValues?: readonly string[];
};

type XmlComponentDefinition = {
    component: ComponentType<any>;
    props?: Record<string, XmlPropDefinition>;
    children?: boolean;
};

type XmlRenderAdapter = (node: ASTNode, ctx: ExecutionContext, key: Key) => ReactNode;

/** Defines a string XML prop that is evaluated against the runtime context. */
function stringProp(defaultValue?: string): XmlPropDefinition {
    return { kind: 'string', defaultValue };
}


/** Defines a boolean XML prop that accepts true/false strings or expression values. */
function booleanProp(defaultValue?: boolean): XmlPropDefinition {
    return { kind: 'boolean', defaultValue };
}


/** Defines an enum XML prop and keeps the accepted values visible in the registry. */
function enumProp(enumValues: readonly string[], defaultValue?: string): XmlPropDefinition {
    return { kind: 'enum', enumValues, defaultValue };
}


/** Defines a raw evaluated XML prop for values that should not be stringified. */
function valueProp(defaultValue?: unknown): XmlPropDefinition {
    return { kind: 'value', defaultValue };
}


/** Coerces XML boolean-like attributes into React boolean props. */
function coerceBoolean(value: unknown, defaultValue: unknown): boolean | undefined {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    if (value == null || value === '') return defaultValue as boolean | undefined;

    return true;
}


/** Evaluates and coerces one XML prop based on the component registry schema. */
function parseProp(
    tagName: string,
    propName: string,
    definition: XmlPropDefinition,
    params: Record<string, string> | undefined,
    ctx: ExecutionContext,
): unknown {
    const rawValue = params?.[propName];
    const hasValue = rawValue != null && rawValue !== '';
    const evaluated = hasValue ? evaluate(rawValue, ctx) : definition.defaultValue;

    if (definition.kind === 'boolean') {
        return coerceBoolean(evaluated, definition.defaultValue);
    }

    if (definition.kind === 'value') {
        return evaluated;
    }

    const stringValue = evaluated == null ? undefined : String(evaluated);

    if (definition.kind === 'enum' && stringValue != null) {
        if (!definition.enumValues?.includes(stringValue)) {
            throw new Error(
                `${tagName}.${propName} must be one of ${definition.enumValues?.join(', ')}, but got ${stringValue}`,
            );
        }
    }

    return stringValue;
}


/** Converts XML attributes into React props using the registry metadata. */
function parseProps(
    tagName: string,
    propDefinitions: Record<string, XmlPropDefinition> | undefined,
    node: ASTNode,
    ctx: ExecutionContext,
): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    for (const [propName, definition] of Object.entries(propDefinitions ?? {})) {
        const value = parseProp(tagName, propName, definition, node.params, ctx);
        if (value !== undefined) props[propName] = value;
    }

    return props;
}


/** Creates a render adapter from a declarative XML component definition. */
function createComponentAdapter(tagName: string, definition: XmlComponentDefinition): XmlRenderAdapter {
    const Component = definition.component;

    return (node, ctx, key) => {
        const props = parseProps(tagName, definition.props, node, ctx);
        if (definition.children !== false) props.children = node.children;

        return <Component key={key} {...props} />;
    };
}


/** Registry of XML components, their React targets, prop types, and enum values. */
const xmlComponents: Record<string, XmlComponentDefinition> = {
    longlink: { component: Longlink },
    Divider: { component: Divider, children: false },
    Icon: { component: Icon, children: false, props: { name: stringProp('') } },
    Tabs: {
        component: Tabs,
        props: { defaultValue: stringProp(), orientation: enumProp(['horizontal', 'vertical'], 'horizontal') },
    },
    TabsList: { component: TabsList, props: { variant: enumProp(['default', 'line'], 'default') } },
    TabsTrigger: { component: TabsTrigger, props: { value: stringProp() } },
    TabsContent: { component: TabsContent, props: { value: stringProp() } },
    Hero: { component: Hero, props: { icon: stringProp() } },
    HeroTitle: { component: HeroTitle },
    HeroDescription: { component: HeroDescription },
    HeroContent: { component: HeroContent },
    P: { component: P },
    Br: { component: Br, children: false },
    B: { component: B },
    H1: { component: H1 },
    H2: { component: H2 },
    H3: { component: H3 },
    H4: { component: H4 },
    Code: { component: Code },
    S: { component: S },
    Sup: { component: Sup },
    Sub: { component: Sub },
    U: { component: U },
    Ul: { component: Ul },
    Li: { component: Li },
    Ol: { component: Ol },
    A: { component: A, props: { active: enumProp(['always', 'hover']), href: stringProp('') } },
    ButtonGroup: { component: ButtonGroup, props: { orientation: enumProp(['horizontal', 'vertical'], 'horizontal') } },
    ButtonGroupText: { component: ButtonGroupText },
    ButtonGroupSeparator: {
        component: ButtonGroupSeparator,
        children: false,
        props: { orientation: enumProp(['horizontal', 'vertical'], 'vertical') },
    },
    InputGroup: { component: InputGroup },
    InputGroupAddon: {
        component: InputGroupAddon,
        props: { align: enumProp(['inline-start', 'inline-end', 'block-start', 'block-end'], 'inline-start') },
    },
    InputGroupButton: {
        component: InputGroupButton,
        props: {
            disabled: booleanProp(),
            size: enumProp(['xs', 'sm', 'icon-xs', 'icon-sm'], 'xs'),
            type: enumProp(['button', 'submit', 'reset'], 'button'),
            variant: stringProp('ghost'),
        },
    },
    InputGroupText: { component: InputGroupText },
    Badge: { component: Badge, props: { variant: stringProp('default') } },
    Avatar: { component: Avatar, props: { size: stringProp('default') } },
    AvatarImage: { component: AvatarImage, children: false, props: { alt: stringProp(), src: stringProp() } },
    AvatarFallback: { component: AvatarFallback },
    AvatarBadge: { component: AvatarBadge },
    Columns: { component: Columns },
    Column: { component: Column, props: { width: stringProp() } },
    Grid: { component: Grid, props: { columns: stringProp() } },
    Stack: { component: Stack },
    Card: { component: Card, props: { size: stringProp('default') } },
    CardHeader: { component: CardHeader },
    CardTitle: { component: CardTitle },
    CardDescription: { component: CardDescription },
    CardAction: { component: CardAction },
    CardContent: { component: CardContent },
    CardFooter: { component: CardFooter },
    Dialog: { component: Dialog, props: { defaultOpen: booleanProp(), open: booleanProp() } },
    DialogTrigger: { component: DialogTrigger },
    DialogContent: { component: DialogContent },
    DialogHeader: { component: DialogHeader },
    DialogTitle: { component: DialogTitle },
    DialogDescription: { component: DialogDescription },
    DialogFooter: { component: DialogFooter },
    TooltipProvider: { component: TooltipProvider },
    Tooltip: { component: Tooltip, props: { defaultOpen: booleanProp(), open: booleanProp() } },
    TooltipTrigger: { component: TooltipTrigger },
    TooltipContent: {
        component: TooltipContent,
        props: {
            align: enumProp(['start', 'center', 'end'], 'center'),
            alignOffset: stringProp('0'),
            hidden: booleanProp(),
            side: enumProp(['top', 'right', 'bottom', 'left'], 'top'),
            sideOffset: stringProp('4'),
        },
    },
    FieldSet: { component: FieldSet },
    FieldLegend: { component: FieldLegend, props: { variant: enumProp(['legend', 'label'], 'legend') } },
    FieldGroup: { component: FieldGroup },
    Field: { component: Field, props: { orientation: enumProp(['vertical', 'horizontal', 'responsive'], 'vertical') } },
    FieldContent: { component: FieldContent },
    FieldLabel: { component: FieldLabel, props: { htmlFor: stringProp() } },
    FieldTitle: { component: FieldTitle },
    FieldDescription: { component: FieldDescription },
    FieldSeparator: { component: FieldSeparator },
    FieldError: { component: FieldError, props: { errors: valueProp() } },
    RadioGroup: {
        component: RadioGroup,
        props: {
            defaultValue: valueProp(),
            disabled: booleanProp(),
            form: stringProp(),
            name: stringProp(),
            readOnly: booleanProp(),
            required: booleanProp(),
            value: valueProp(),
        },
    },
    RadioGroupItem: {
        component: RadioGroupItem,
        props: { disabled: booleanProp(), readOnly: booleanProp(), required: booleanProp(), value: stringProp() },
    },
    Label: { component: Label, props: { htmlFor: stringProp() } },
    Select: {
        component: Select,
        props: { defaultOpen: booleanProp(), defaultValue: stringProp(), open: booleanProp(), value: valueProp() },
    },
    SelectTrigger: { component: SelectTrigger },
    SelectValue: { component: SelectValue, children: false, props: { placeholder: stringProp() } },
    SelectContent: { component: SelectContent },
    SelectGroup: { component: SelectGroup },
    SelectLabel: { component: SelectLabel },
    SelectItem: { component: SelectItem, props: { value: stringProp() } },
    SelectSeparator: { component: SelectSeparator, children: false },
    Table: { component: Table },
    TableHeader: { component: TableHeader },
    TableBody: { component: TableBody },
    TableFooter: { component: TableFooter },
    TableRow: { component: TableRow },
    TableHead: { component: TableHead },
    TableCell: { component: TableCell },
    Menu: { component: Menu, props: { defaultValue: stringProp(), value: stringProp() } },
    MenuList: { component: MenuList },
    MenuSection: {
        component: MenuSection,
        props: { disabled: booleanProp(), label: stringProp(), value: stringProp() },
    },
    MenuSubSection: {
        component: MenuSubSection,
        props: { disabled: booleanProp(), label: stringProp(), value: stringProp() },
    },
    MenuContent: { component: MenuContent, props: { className: stringProp(), value: stringProp() } },
};

/** Central registry for XML tags that render through dedicated adapters. */
const xmlComponentRegistry: Record<string, XmlRenderAdapter> = {
    State: (_node, _ctx, key) => <Fragment key={key} />,
    Query: (_node, _ctx, key) => <Fragment key={key} />,
};

for (const [tagName, definition] of Object.entries(xmlComponents)) {
    xmlComponentRegistry[tagName] = createComponentAdapter(tagName, definition);
}


/** Renders a registered XML component, returning undefined for tags still handled by the legacy renderer. */
export function renderRegisteredNode(node: ASTNode, ctx: ExecutionContext, key: Key): ReactNode | undefined {
    return xmlComponentRegistry[node.name]?.(node, ctx, key);
}


/** Returns the names currently owned by the central XML component registry. */
export function getRegisteredXmlComponentNames(): string[] {
    return Object.keys(xmlComponentRegistry);
}


/** Returns the component registry definitions for tests and schema maintenance. */
export function getXmlComponentDefinitions(): Record<string, XmlComponentDefinition> {
    return xmlComponents;
}

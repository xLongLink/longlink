import { A } from '@xml/adapters/A';
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@xml/adapters/Avatar';
import { B } from '@xml/adapters/B';
import { Badge } from '@xml/adapters/Badge';
import { Br } from '@xml/adapters/Br';
import { Button } from '@xml/adapters/Button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@xml/adapters/ButtonGroup';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@xml/adapters/Card';
import { Checkbox } from '@xml/adapters/Checkbox';
import { Code } from '@xml/adapters/Code';
import { Column, Columns } from '@xml/adapters/Columns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@xml/adapters/Dialog';
import { Divider } from '@xml/adapters/Divider';
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
} from '@xml/adapters/Field';
import { Grid } from '@xml/adapters/Grid';
import { H1 } from '@xml/adapters/H1';
import { H2 } from '@xml/adapters/H2';
import { H3 } from '@xml/adapters/H3';
import { H4 } from '@xml/adapters/H4';
import { Hero, HeroContent, HeroDescription, HeroTitle } from '@xml/adapters/Hero';
import { Icon } from '@xml/adapters/Icon';
import { Input } from '@xml/adapters/Input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
} from '@xml/adapters/InputGroup';
import { Label } from '@xml/adapters/Label';
import { Li } from '@xml/adapters/Li';
import { Longlink } from '@xml/adapters/Longlink';
import { Menu, MenuContent, MenuList, MenuSection, MenuSubSection } from '@xml/adapters/Menu';
import { Ol } from '@xml/adapters/Ol';
import { P } from '@xml/adapters/P';
import { RadioGroup, RadioGroupItem } from '@xml/adapters/RadioGroup';
import { S } from '@xml/adapters/S';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@xml/adapters/Select';
import { Slider } from '@xml/adapters/Slider';
import { Stack } from '@xml/adapters/Stack';
import { Sub } from '@xml/adapters/Sub';
import { Sup } from '@xml/adapters/Sup';
import { Switch } from '@xml/adapters/Switch';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@xml/adapters/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@xml/adapters/Tabs';
import { Textarea } from '@xml/adapters/Textarea';
import { Toggle } from '@xml/adapters/Toggle';
import { ToggleGroup, ToggleGroupItem } from '@xml/adapters/ToggleGroup';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@xml/adapters/Tooltip';
import { U } from '@xml/adapters/U';
import { Ul } from '@xml/adapters/Ul';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { Fragment, type ComponentType, type Key, type ReactNode } from 'react';

type XmlPropKind = 'boolean' | 'compiledExpression' | 'enum' | 'number' | 'string' | 'stringArray' | 'value';

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

/** Defines a number XML prop that accepts numeric text or expression values. */
function numberProp(defaultValue?: number): XmlPropDefinition {
    return { kind: 'number', defaultValue };
}

/** Defines a raw evaluated XML prop for values that should not be stringified. */
function valueProp(defaultValue?: unknown): XmlPropDefinition {
    return { kind: 'value', defaultValue };
}

/** Defines a compiled expression prop resolved later by the target component. */
function compiledExpressionProp(): XmlPropDefinition {
    return { kind: 'compiledExpression' };
}

/** Defines a string array prop that ignores non-array values. */
function stringArrayProp(defaultValue: string[] = []): XmlPropDefinition {
    return { kind: 'stringArray', defaultValue };
}

/** Creates a render adapter from a declarative XML component definition. */
function createComponentAdapter(_tagName: string, definition: XmlComponentDefinition): XmlRenderAdapter {
    return (node, ctx, key) => {
        void ctx;

        return <definition.component key={key} props={node.params ?? {}} nodes={node.children ?? []} />;
    };
}

/** Registry of XML components, their React targets, prop types, and enum values. */
const xmlComponents: Record<string, XmlComponentDefinition> = {
    longlink: {
        component: Longlink,
    },
    Divider: {
        component: Divider,
        children: false,
    },
    Icon: {
        component: Icon,
        children: false,
        props: {
            name: stringProp(''),
        },
    },
    Tabs: {
        component: Tabs,
        props: {
            defaultValue: stringProp(),
            orientation: enumProp(['horizontal', 'vertical'], 'horizontal'),
        },
    },
    TabsList: {
        component: TabsList,
        props: {
            variant: enumProp(['default', 'line'], 'default'),
        },
    },
    TabsTrigger: {
        component: TabsTrigger,
        props: {
            value: stringProp(),
        },
    },
    TabsContent: {
        component: TabsContent,
        props: {
            value: stringProp(),
        },
    },
    Hero: {
        component: Hero,
        props: {
            icon: stringProp(),
        },
    },
    HeroTitle: {
        component: HeroTitle,
    },
    HeroDescription: {
        component: HeroDescription,
    },
    HeroContent: {
        component: HeroContent,
    },
    P: {
        component: P,
    },
    Br: {
        component: Br,
        children: false,
    },
    B: {
        component: B,
    },
    H1: {
        component: H1,
    },
    H2: {
        component: H2,
    },
    H3: {
        component: H3,
    },
    H4: {
        component: H4,
    },
    Code: {
        component: Code,
    },
    S: {
        component: S,
    },
    Sup: {
        component: Sup,
    },
    Sub: {
        component: Sub,
    },
    U: {
        component: U,
    },
    Ul: {
        component: Ul,
    },
    Li: {
        component: Li,
    },
    Ol: {
        component: Ol,
    },
    A: {
        component: A,
        props: {
            active: enumProp(['always', 'hover']),
            href: stringProp(''),
        },
    },
    Button: {
        component: Button,
        props: {
            action: stringProp(''),
            invalidate: stringArrayProp(),
            json: compiledExpressionProp(),
            method: stringProp('POST'),
            size: stringProp('default'),
            submit: booleanProp(false),
            variant: stringProp('default'),
        },
    },
    ButtonGroup: {
        component: ButtonGroup,
        props: {
            orientation: enumProp(['horizontal', 'vertical'], 'horizontal'),
        },
    },
    ButtonGroupText: {
        component: ButtonGroupText,
    },
    ButtonGroupSeparator: {
        component: ButtonGroupSeparator,
        children: false,
        props: {
            orientation: enumProp(['horizontal', 'vertical'], 'vertical'),
        },
    },
    InputGroup: {
        component: InputGroup,
    },
    InputGroupAddon: {
        component: InputGroupAddon,
        props: {
            align: enumProp(['inline-start', 'inline-end', 'block-start', 'block-end'], 'inline-start'),
        },
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
    InputGroupText: {
        component: InputGroupText,
    },
    Input: {
        component: Input,
        children: false,
        props: {
            'aria-invalid': booleanProp(),
            autoComplete: stringProp(),
            disabled: booleanProp(),
            id: stringProp(),
            label: stringProp(),
            placeholder: valueProp(),
            type: stringProp('text'),
            value: valueProp(),
        },
    },
    InputGroupInput: {
        component: InputGroupInput,
        children: false,
        props: {
            'aria-invalid': booleanProp(),
            autoComplete: stringProp(),
            disabled: booleanProp(),
            id: stringProp(),
            label: stringProp(),
            placeholder: valueProp(),
            type: stringProp('text'),
            value: valueProp(),
        },
    },
    Textarea: {
        component: Textarea,
        children: false,
        props: {
            cols: stringProp(),
            disabled: booleanProp(),
            id: stringProp(),
            label: stringProp(),
            placeholder: valueProp(),
            rows: stringProp(),
            value: valueProp(),
        },
    },
    InputGroupTextarea: {
        component: InputGroupTextarea,
        children: false,
        props: {
            cols: stringProp(),
            disabled: booleanProp(),
            id: stringProp(),
            label: stringProp(),
            placeholder: valueProp(),
            rows: stringProp(),
            value: valueProp(),
        },
    },
    Checkbox: {
        component: Checkbox,
        children: false,
        props: {
            checked: valueProp(),
            defaultChecked: booleanProp(),
            disabled: booleanProp(),
            id: stringProp(),
        },
    },
    Switch: {
        component: Switch,
        children: false,
        props: {
            checked: valueProp(),
            defaultChecked: booleanProp(),
            disabled: booleanProp(),
            id: stringProp(),
            size: enumProp(['sm', 'default'], 'default'),
        },
    },
    Slider: {
        component: Slider,
        children: false,
        props: {
            defaultValue: valueProp(),
            disabled: booleanProp(),
            id: stringProp(),
            max: stringProp(),
            min: stringProp(),
            name: stringProp(),
            orientation: enumProp(['horizontal', 'vertical'], 'horizontal'),
            step: stringProp(),
            value: valueProp(),
        },
    },
    Toggle: {
        component: Toggle,
        props: {
            defaultPressed: booleanProp(),
            disabled: booleanProp(),
            id: stringProp(),
            pressed: valueProp(),
            size: enumProp(['sm', 'default', 'lg'], 'default'),
            variant: enumProp(['default', 'outline'], 'default'),
        },
    },
    ToggleGroup: {
        component: ToggleGroup,
        props: {
            defaultValue: valueProp(),
            disabled: booleanProp(),
            loopFocus: booleanProp(),
            orientation: enumProp(['horizontal', 'vertical'], 'horizontal'),
            size: enumProp(['sm', 'default', 'lg'], 'default'),
            spacing: numberProp(0),
            type: enumProp(['single', 'multiple'], 'single'),
            value: valueProp(),
            variant: enumProp(['default', 'outline'], 'default'),
        },
    },
    ToggleGroupItem: {
        component: ToggleGroupItem,
        props: {
            size: enumProp(['sm', 'default', 'lg'], 'default'),
            value: stringProp(),
            variant: enumProp(['default', 'outline'], 'default'),
        },
    },
    Badge: {
        component: Badge,
        props: {
            variant: stringProp('default'),
        },
    },
    Avatar: {
        component: Avatar,
        props: {
            size: stringProp('default'),
        },
    },
    AvatarImage: {
        component: AvatarImage,
        children: false,
        props: {
            alt: stringProp(),
            src: stringProp(),
        },
    },
    AvatarFallback: {
        component: AvatarFallback,
    },
    AvatarBadge: {
        component: AvatarBadge,
    },
    Columns: {
        component: Columns,
    },
    Column: {
        component: Column,
        props: {
            width: stringProp(),
        },
    },
    Grid: {
        component: Grid,
        props: {
            columns: stringProp(),
        },
    },
    Stack: {
        component: Stack,
    },
    Card: {
        component: Card,
        props: {
            size: stringProp('default'),
        },
    },
    CardHeader: {
        component: CardHeader,
    },
    CardTitle: {
        component: CardTitle,
    },
    CardDescription: {
        component: CardDescription,
    },
    CardAction: {
        component: CardAction,
    },
    CardContent: {
        component: CardContent,
    },
    CardFooter: {
        component: CardFooter,
    },
    Dialog: {
        component: Dialog,
        props: {
            defaultOpen: booleanProp(),
            open: booleanProp(),
        },
    },
    DialogTrigger: {
        component: DialogTrigger,
    },
    DialogContent: {
        component: DialogContent,
    },
    DialogHeader: {
        component: DialogHeader,
    },
    DialogTitle: {
        component: DialogTitle,
    },
    DialogDescription: {
        component: DialogDescription,
    },
    DialogFooter: {
        component: DialogFooter,
    },
    TooltipProvider: {
        component: TooltipProvider,
    },
    Tooltip: {
        component: Tooltip,
        props: {
            defaultOpen: booleanProp(),
            open: booleanProp(),
        },
    },
    TooltipTrigger: {
        component: TooltipTrigger,
    },
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
    FieldSet: {
        component: FieldSet,
    },
    FieldLegend: {
        component: FieldLegend,
        props: {
            variant: enumProp(['legend', 'label'], 'legend'),
        },
    },
    FieldGroup: {
        component: FieldGroup,
    },
    Field: {
        component: Field,
        props: {
            orientation: enumProp(['vertical', 'horizontal', 'responsive'], 'vertical'),
        },
    },
    FieldContent: {
        component: FieldContent,
    },
    FieldLabel: {
        component: FieldLabel,
        props: {
            htmlFor: stringProp(),
        },
    },
    FieldTitle: {
        component: FieldTitle,
    },
    FieldDescription: {
        component: FieldDescription,
    },
    FieldSeparator: {
        component: FieldSeparator,
    },
    FieldError: {
        component: FieldError,
        props: {
            errors: valueProp(),
        },
    },
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
        props: {
            disabled: booleanProp(),
            readOnly: booleanProp(),
            required: booleanProp(),
            value: stringProp(),
        },
    },
    Label: {
        component: Label,
        props: {
            htmlFor: stringProp(),
        },
    },
    Select: {
        component: Select,
        props: {
            defaultOpen: booleanProp(),
            defaultValue: stringProp(),
            open: booleanProp(),
            value: valueProp(),
        },
    },
    SelectTrigger: {
        component: SelectTrigger,
    },
    SelectValue: {
        component: SelectValue,
        children: false,
        props: {
            placeholder: stringProp(),
        },
    },
    SelectContent: {
        component: SelectContent,
    },
    SelectGroup: {
        component: SelectGroup,
    },
    SelectLabel: {
        component: SelectLabel,
    },
    SelectItem: {
        component: SelectItem,
        props: {
            value: stringProp(),
        },
    },
    SelectSeparator: {
        component: SelectSeparator,
        children: false,
    },
    Table: {
        component: Table,
    },
    TableHeader: {
        component: TableHeader,
    },
    TableBody: {
        component: TableBody,
    },
    TableFooter: {
        component: TableFooter,
    },
    TableRow: {
        component: TableRow,
    },
    TableHead: {
        component: TableHead,
    },
    TableCell: {
        component: TableCell,
    },
    Menu: {
        component: Menu,
        props: {
            defaultValue: stringProp(),
            value: stringProp(),
        },
    },
    MenuList: {
        component: MenuList,
    },
    MenuSection: {
        component: MenuSection,
        props: {
            disabled: booleanProp(),
            label: stringProp(),
            value: stringProp(),
        },
    },
    MenuSubSection: {
        component: MenuSubSection,
        props: {
            disabled: booleanProp(),
            label: stringProp(),
            value: stringProp(),
        },
    },
    MenuContent: {
        component: MenuContent,
        props: {
            className: stringProp(),
            value: stringProp(),
        },
    },
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

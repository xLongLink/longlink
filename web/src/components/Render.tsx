import { cloneElement, isValidElement, useEffect, type ReactNode } from 'react';

import { type ApiTableColumn } from '@/components/table/buildColumns';
import { Components, Layout } from '@/lib/registry';
import { Button as UIButton } from '@/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/dialog';
import { Label } from '@/ui/label';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import {
    createRegistry,
    renderNode,
    transformJsonTree,
    type ComponentNode,
    type JsonNode,
    type RegistryEntry,
    isComponentNode,
    isPrimitiveNode,
} from '@/longlink/rendering';

type RenderNodeSchema = unknown;

const REMOVED_LOGIC_TYPES = new Set(['If', 'ForEach', 'Query', 'State']);

const TYPE_ALIASES: Record<string, string> = {
    button: 'Button',
    card: 'Card',
    cardaction: 'CardAction',
    cardcontent: 'CardContent',
    carddescription: 'CardDescription',
    cardfooter: 'CardFooter',
    cardheader: 'CardHeader',
    cardtitle: 'CardTitle',
    checkbox: 'Checkbox',
    column: 'Column',
    columns: 'Columns',
    dialog: 'Dialog',
    dialogcontent: 'DialogContent',
    dialogtrigger: 'DialogTrigger',
    blockquote: 'Blockquote',
    code: 'Code',
    field: 'Field',
    h1: 'H1',
    h2: 'H2',
    h3: 'H3',
    h4: 'H4',
    hero: 'Hero',
    icon: 'Icon',
    input: 'Input',
    li: 'Li',
    menu: 'Menu',
    menusection: 'MenuSection',
    menusubsection: 'MenuSubSection',
    page: 'Page',
    p: 'P',
    range: 'Range',
    select: 'Select',
    separator: 'Separator',
    stack: 'Stack',
    switch: 'Switch',
    table: 'Table',
    tablebody: 'TableBody',
    tablecell: 'TableCell',
    tablehead: 'TableHead',
    tableheader: 'TableHeader',
    tablerow: 'TableRow',
    tabs: 'Tabs',
    tabscontent: 'TabsContent',
    tabslist: 'TabsList',
    tabstrigger: 'TabsTrigger',
    textarea: 'Textarea',
    ul: 'Ul',
};

const LonglinkButton = Components.Button;
const LonglinkTable = Layout.Table;

function normalizeType(type: string) {
    return type.trim().toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceXmlScalar(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    const lowered = trimmed.toLowerCase();

    if (lowered === 'true') {
        return true;
    }

    if (lowered === 'false') {
        return false;
    }

    if (lowered === 'null' || lowered === 'none') {
        return null;
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    if (/^-?\d+$/.test(trimmed)) {
        return Number.parseInt(trimmed, 10);
    }

    if (/^-?\d+\.\d+$/.test(trimmed)) {
        return Number.parseFloat(trimmed);
    }

    return value;
}

function normalizeXmlElement(name: string, value: unknown): ComponentNode {
    if (value == null || value === '') {
        return {
            type: name,
            props: {},
            children: [],
        };
    }

    if (!isPlainObject(value)) {
        return {
            type: name,
            props: {},
            children: [coerceXmlScalar(value) as JsonNode],
        };
    }

    const props: Record<string, unknown> = {};
    const children: JsonNode[] = [];

    for (const [key, item] of Object.entries(value)) {
        if (key === '#text') {
            const text = typeof item === 'string' ? item.trim() : item;
            if (text !== '' && text != null) {
                children.push(coerceXmlScalar(text) as JsonNode);
            }
            continue;
        }

        if (key.startsWith('@')) {
            props[key.slice(1)] = coerceXmlScalar(item);
            continue;
        }

        const childItems = Array.isArray(item) ? item : [item];
        for (const childItem of childItems) {
            children.push(normalizeXmlElement(key, childItem));
        }
    }

    return {
        type: name,
        props,
        children,
    };
}

export function normalizeRenderRoots(schema: unknown): JsonNode[] {
    if (schema == null) {
        return [];
    }

    if (Array.isArray(schema)) {
        return schema as JsonNode[];
    }

    if (isComponentNode(schema) || isPrimitiveNode(schema)) {
        return [schema as JsonNode];
    }

    if (!isPlainObject(schema)) {
        return [];
    }

    if ('Page' in schema) {
        return [normalizeXmlElement('Page', schema.Page)];
    }

    if ('page' in schema) {
        return [normalizeXmlElement('Page', schema.page)];
    }

    return [];
}

function px(value: unknown, fallback: number) {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    if (typeof value === 'string' && value.trim()) {
        return /^\d+$/.test(value.trim()) ? `${value.trim()}px` : value;
    }

    return `${fallback}px`;
}

function extractText(node: JsonNode | JsonNode[] | undefined): string | undefined {
    if (node == null) {
        return undefined;
    }

    if (Array.isArray(node)) {
        const parts = node
            .map((child) => extractText(child))
            .filter((part): part is string => typeof part === 'string' && part.length > 0);

        return parts.length > 0 ? parts.join(' ') : undefined;
    }

    if (isPrimitiveNode(node)) {
        return node == null ? undefined : String(node);
    }

    return undefined;
}

function extractColumnDefinitions(node: ComponentNode): ApiTableColumn[] | undefined {
    if (!node.children) {
        return undefined;
    }

    const children = Array.isArray(node.children) ? node.children : [node.children];
    const columns = children
        .filter((child): child is ComponentNode => isComponentNode(child) && child.type === 'Column')
        .map((child) => (child.props ?? {}) as ApiTableColumn);

    return columns.length > 0 ? columns : undefined;
}

function prepareNode(node: JsonNode): JsonNode {
    return transformJsonTree(node, (currentNode) => {
        if (!isComponentNode(currentNode)) {
            return currentNode;
        }

        const nextType = TYPE_ALIASES[normalizeType(currentNode.type)] ?? currentNode.type;

        if (REMOVED_LOGIC_TYPES.has(nextType)) {
            return null;
        }

        return {
            ...currentNode,
            type: nextType,
        };
    });
}

function Page({ title, name, children }: { title?: string; name?: string; children?: ReactNode }) {
    const documentTitle = title ?? name;

    useEffect(() => {
        if (typeof documentTitle === 'string' && documentTitle.trim()) {
            document.title = documentTitle;
        }
    }, [documentTitle]);

    return <div className="space-y-6">{children}</div>;
}

function Stack({
    align = 'stretch',
    children,
    direction = 'column',
    gap = 16,
    justify = 'start',
}: {
    align?: string;
    children?: ReactNode;
    direction?: string;
    gap?: number | string;
    justify?: string;
}) {
    return (
        <div
            className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'}`}
            style={{
                gap: px(gap, 16),
                justifyContent:
                    justify === 'between'
                        ? 'space-between'
                        : justify === 'center'
                          ? 'center'
                          : justify === 'end'
                            ? 'flex-end'
                            : 'flex-start',
                alignItems:
                    align === 'center'
                        ? 'center'
                        : align === 'end'
                          ? 'flex-end'
                          : align === 'start'
                            ? 'flex-start'
                            : 'stretch',
            }}
        >
            {children}
        </div>
    );
}

function Field({ children, label }: { children?: ReactNode; label?: string }) {
    if (!label && children == null) {
        return null;
    }

    return (
        <div className="space-y-2">
            {typeof label === 'string' && label.trim() ? <Label>{label}</Label> : null}
            {children}
        </div>
    );
}

function RuntimeDialogTrigger({ children }: { children?: ReactNode }) {
    if (isValidElement(children)) {
        return <DialogTrigger render={cloneElement(children)} />;
    }

    return <DialogTrigger render={<UIButton variant="outline" />}>{children}</DialogTrigger>;
}

function RuntimeDialogContent({ children, title }: { children?: ReactNode; title?: string }) {
    return (
        <DialogContent className="sm:max-w-3xl">
            {typeof title === 'string' && title.trim() ? (
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
            ) : null}
            <div className="space-y-4">{children}</div>
        </DialogContent>
    );
}

function RuntimeTable({
    children,
    columns,
    data,
    endpoint,
    schema,
    ...props
}: {
    children?: ReactNode;
    columns?: ApiTableColumn[];
    data?: object[];
    endpoint?: string;
    schema?: unknown;
}) {
    if (typeof endpoint === 'string' && schema != null) {
        return <LonglinkTable {...props} endpoint={endpoint} schema={schema as never} />;
    }

    if (Array.isArray(data) && Array.isArray(columns)) {
        return <LonglinkTable {...props} columns={columns} data={data} />;
    }

    return <UITable>{children}</UITable>;
}

const runtimeRegistry = createRegistry({
    ...Layout,
    ...Components,
    Button: {
        component: LonglinkButton,
        getProps: (node) => {
            const props = node.props ?? {};
            const text = typeof props.text === 'string' ? props.text : extractText(node.children);
            const action = typeof props.action === 'string' && props.action.startsWith('/') ? props.action : undefined;

            return {
                ...props,
                text,
                url: props.url ?? action,
            };
        },
        renderChildren: false,
    } satisfies RegistryEntry,
    Dialog,
    DialogContent: RuntimeDialogContent,
    DialogTrigger: RuntimeDialogTrigger,
    Field,
    Page,
    Stack,
    Table: {
        component: RuntimeTable,
        getProps: (node) => ({
            ...node.props,
            columns: Array.isArray(node.props?.columns) ? node.props.columns : extractColumnDefinitions(node),
        }),
    } satisfies RegistryEntry,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
});

export type { RenderNodeSchema };

type RenderProps = {
    node: unknown;
};

export function renderLonglinkNode(node: unknown) {
    const roots = normalizeRenderRoots(node).map((root) => prepareNode(root));
    return renderNode(roots, runtimeRegistry);
}

export function Render({ node }: RenderProps) {
    return renderLonglinkNode(node);
}

export default Render;

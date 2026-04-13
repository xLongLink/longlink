import { createElement, useEffect, type ReactNode } from 'react';

import Checkbox from '@/longlink/Checkbox';
import Columns, { Column } from '@/longlink/Columns';
import Dialog from '@/longlink/Dialog';
import Hero from '@/longlink/Hero';
import { Icon } from '@/longlink/Icon';
import Input from '@/longlink/Input';
import Menu, { MenuSection, MenuSubSection } from '@/longlink/Menu';
import Range from '@/longlink/Range';
import Select from '@/longlink/Select';
import Separator from '@/longlink/Separator';
import Slider from '@/longlink/Slider';
import Switch from '@/longlink/Switch';
import Table from '@/longlink/Table';
import Textarea from '@/longlink/Textarea';
import { Blockquote, Code, H1, H2, H3, H4, Li, P, Ul } from '@/longlink/Typography';
import { createRegistry, isComponentNode, type ComponentNode, type RegistryEntry } from '@/rendering';
import { Button } from '@/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card';
import {
    Dialog as UIDialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/ui/dialog';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';

import { type ApiTableColumn } from '@/components/table/buildColumns';

const ALIGN_ITEMS = {
    center: 'center',
    end: 'flex-end',
    start: 'flex-start',
    stretch: 'stretch',
} as const;

const JUSTIFY_CONTENT = {
    between: 'space-between',
    center: 'center',
    end: 'flex-end',
    start: 'flex-start',
} as const;

function px(value: unknown, fallback: number) {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
            return /^\d+$/.test(trimmed) ? `${trimmed}px` : trimmed;
        }
    }

    return `${fallback}px`;
}

function extractColumnDefinitions(node: ComponentNode): ApiTableColumn[] | undefined {
    const children = node.children == null ? [] : Array.isArray(node.children) ? node.children : [node.children];
    const columns = children
        .filter((child): child is ComponentNode => isComponentNode(child) && child.type.toLowerCase() === 'column')
        .map((child) => (child.props ?? {}) as ApiTableColumn);

    return columns.length > 0 ? columns : undefined;
}

function Page({ title, name, children }: { title?: string; name?: string; children?: ReactNode }) {
    const documentTitle = title ?? name;

    useEffect(() => {
        if (typeof documentTitle === 'string' && documentTitle.trim()) {
            document.title = documentTitle;
        }
    }, [documentTitle]);

    return createElement('div', { className: 'space-y-6' }, children);
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
    return createElement(
        'div',
        {
            className: `flex ${direction === 'row' ? 'flex-row' : 'flex-col'}`,
            style: {
                gap: px(gap, 16),
                justifyContent: JUSTIFY_CONTENT[justify as keyof typeof JUSTIFY_CONTENT] ?? JUSTIFY_CONTENT.start,
                alignItems: ALIGN_ITEMS[align as keyof typeof ALIGN_ITEMS] ?? ALIGN_ITEMS.stretch,
            },
        },
        children
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
        return createElement(Table, { ...props, endpoint, schema: schema as never });
    }

    if (Array.isArray(data) && Array.isArray(columns)) {
        return createElement(Table, { ...props, columns, data });
    }

    return createElement(UITable, props, children);
}

export const Layout = {
    Hero,
    Menu,
    MenuSection,
    MenuSubSection,
    Card,
    CardHeader,
    CardContent,
    CardFooter,
    Columns,
    Column,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Table,
};

export const Components = {
    Button,
    CardAction,
    CardDescription,
    CardTitle,
    Checkbox,
    Dialog,
    H1,
    H2,
    H3,
    H4,
    Icon,
    Input,
    Li,
    P,
    Range,
    Select,
    Separator,
    Slider,
    Switch,
    Textarea,
    Blockquote,
    Code,
    Ul,
};

export const Logic = {};

export const registry = createRegistry({
    ...Layout,
    ...Components,
    ...Logic,
    Dialog: UIDialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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

export default registry;

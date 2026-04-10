import Button from '@/longlink/Button';
import Checkbox from '@/longlink/Checkbox';
import Columns, { Column } from '@/longlink/Columns';
import Dialog from '@/longlink/Dialog';
import Hero from '@/longlink/Hero';
import Input from '@/longlink/Input';
import Menu, { MenuSection, MenuSubSection } from '@/longlink/Menu';
import Range from '@/longlink/Range';
import {
    createRegistry,
    renderNode,
    type ComponentNode,
    type JsonNode,
    type RegistryEntry,
} from '@/longlink/rendering';
import Separator from '@/longlink/Separator';
import Select from '@/longlink/Select';
import Switch from '@/longlink/Switch';
import Table, { type ApiTableColumn } from '@/longlink/Table';
import Tabs, { Tab } from '@/longlink/Tabs';
import Textarea from '@/longlink/Textarea';
import { isComponentNode } from '@/longlink/rendering';

function resolveTableColumns(node: ComponentNode): ApiTableColumn[] {
    if (!Array.isArray(node.children)) {
        return [];
    }

    return node.children
        .filter((child): child is ComponentNode => isComponentNode(child) && child.type === 'column')
        .map((child) => ({
            key: String(child.props?.key ?? ''),
            label: child.props?.label == null ? undefined : String(child.props.label),
            align: child.props?.align == null ? undefined : (String(child.props.align) as ApiTableColumn['align']),
            content: child.props?.content as ApiTableColumn['content'],
            detail: child.props?.detail as ApiTableColumn['detail'],
            value: child.props?.value == null ? undefined : String(child.props.value),
        }))
        .filter((column) => column.key);
}

const longlinkRegistry = createRegistry({
    hero: Hero,
    dialog: Dialog,
    button: Button,
    table: {
        component: Table as RegistryEntry['component'],
        renderChildren: false,
        getProps: (node) => ({
            data: Array.isArray(node.props?.data) ? (node.props.data as object[]) : [],
            columns: resolveTableColumns(node),
            pageSize: node.props?.pageSize,
            endpoint: node.props?.endpoint,
            schema: node.props?.schema,
        }),
    },
    columns: Columns,
    column: Column,
    separator: Separator,
    tabs: Tabs,
    tab: Tab,
    menu: Menu,
    menusection: MenuSection,
    menuSubSection: MenuSubSection,
    input: Input,
    select: Select,
    switch: Switch,
    checkbox: Checkbox,
    range: Range,
    textarea: Textarea,
});

export type RenderNodeSchema = JsonNode;

type RenderProps = {
    node: JsonNode;
};

export function renderLonglinkNode(node: JsonNode) {
    return renderNode(node, longlinkRegistry);
}

export function Render({ node }: RenderProps) {
    return <>{renderLonglinkNode(node)}</>;
}

export default Render;

import { createElement, type ReactNode } from 'react';
import { isComponentNode, type ComponentNode } from '@/rendering';
import { Table } from '@/longlink/Table';
import { Table as UITable } from '@/ui/table';
import { type ApiTableColumn } from '@/components/table/buildColumns';

export function extractColumnDefinitions(node: ComponentNode): ApiTableColumn[] | undefined {
    const children = node.children == null ? [] : Array.isArray(node.children) ? node.children : [node.children];
    const columns = children
        .filter((child): child is ComponentNode => isComponentNode(child) && child.type === 'Column')
        .map((child) => (child.props ?? {}) as ApiTableColumn);

    return columns.length > 0 ? columns : undefined;
}

type RuntimeTableProps = {
    children?: ReactNode;
    columns?: ApiTableColumn[];
    data?: object[];
    endpoint?: string;
    schema?: unknown;
    [key: string]: unknown;
};

export function RuntimeTable({ children, columns, data, endpoint, schema, ...props }: RuntimeTableProps) {
    if (typeof endpoint === 'string' && schema != null) {
        return createElement(Table, { ...props, endpoint, schema: schema as never });
    }

    if (Array.isArray(data) && Array.isArray(columns)) {
        return createElement(Table, { ...props, columns, data });
    }

    return createElement(UITable, props, children);
}

export default RuntimeTable;

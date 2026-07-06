import { DataTable as UIDataTable } from '@/components/DataTable';
import type { CellContext, ColumnDef } from '@tanstack/react-table';
import { ContextProvider, useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import { BaseUrlContext, useUrl } from '@/xml/core/url';
import { evaluate, readSafeProperty } from '@/xml/expressions';
import type { ASTNode, ASTProps, ExecutionContext, Props } from '@/xml/types';
import type { ReactNode } from 'react';
import { readXmlProp, resolveXmlString, resolveXmlValue } from './props';

type DataTableRow = Record<string, unknown>;

/** Renders query-backed rows through the shared data table shell. */
export function DataTable({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const baseUrl = useUrl('');

    if (readXmlProp(props, 'data') == null) {
        throw new Error('DataTable requires a data attribute');
    }

    const data = resolveXmlValue(props, 'data', ctx);
    const rows = Array.isArray(data) ? (data as DataTableRow[]) : [];
    const as = resolveXmlString(props, 'as', ctx, 'row');
    const emptyMessage = resolveXmlString(props, 'empty', ctx, 'No results.');
    const columns = nodes
        .filter((node) => node.name === 'DataColumn' && isVisibleNode(node, ctx))
        .map((node, index) => buildDataColumn(node, index, ctx, as, baseUrl));

    if (columns.length === 0) {
        throw new Error('DataTable requires at least one DataColumn');
    }

    return <UIDataTable columns={columns} data={rows} emptyMessage={emptyMessage} />;
}

/** Marks a column definition that is consumed by the nearest DataTable. */
export function DataColumn(): never {
    throw new Error('DataColumn must be used inside DataTable');
}

/** Marks a column header slot that is consumed by the nearest DataTable. */
export function DataHeader(): never {
    throw new Error('DataHeader must be used inside DataColumn');
}

/** Marks a column cell slot that is consumed by the nearest DataTable. */
export function DataCell(): never {
    throw new Error('DataCell must be used inside DataColumn');
}

/** Converts a DataColumn XML node into a TanStack column definition. */
function buildDataColumn(
    node: ASTNode,
    index: number,
    ctx: ExecutionContext,
    as: string,
    baseUrl: string
): ColumnDef<DataTableRow, unknown> {
    const columnProps = node.params ?? {};
    const children = node.children ?? [];
    const field = readXmlProp(columnProps, 'field') ?? '';
    const id = (readXmlProp(columnProps, 'id') ?? field) || `column-${index}`;

    return {
        id,
        ...(field ? { accessorFn: (row) => resolveFieldValue(row, field) } : {}),
        header: () => renderDataHeader(columnProps, children, ctx, baseUrl, field),
        cell: (cellContext) => renderDataCell(children, cellContext, ctx, as, baseUrl),
    };
}

/** Renders the configured header slot or the column shorthand header. */
function renderDataHeader(
    columnProps: ASTProps,
    nodes: ASTNode[],
    ctx: ExecutionContext,
    baseUrl: string,
    field: string
): ReactNode {
    const headerNode = selectVisibleNode(nodes, 'DataHeader', ctx);
    const content = headerNode
        ? renderDataSlotContent(headerNode, ctx)
        : columnProps.i18n
          ? resolveTranslation(columnProps, ctx)
          : resolveXmlString(columnProps, 'header', ctx, field);

    return (
        <ContextProvider value={ctx}>
            <BaseUrlContext.Provider value={baseUrl}>{content}</BaseUrlContext.Provider>
        </ContextProvider>
    );
}

/** Renders a row cell with the row and cell value exposed to nested XML. */
function renderDataCell(
    nodes: ASTNode[],
    cellContext: CellContext<DataTableRow, unknown>,
    ctx: ExecutionContext,
    as: string,
    baseUrl: string
): ReactNode {
    const value = cellContext.getValue();
    const rowCtx = createDataRowContext(ctx, as, cellContext.row.original, cellContext.row.index, value);
    const cellNode = selectVisibleNode(nodes, 'DataCell', rowCtx);
    const content = cellNode ? renderDataSlotContent(cellNode, rowCtx) : formatDataValue(value);

    return (
        <ContextProvider value={rowCtx}>
            <BaseUrlContext.Provider value={baseUrl}>{content}</BaseUrlContext.Provider>
        </ContextProvider>
    );
}

/** Builds a scoped XML context for one rendered data row. */
function createDataRowContext(
    ctx: ExecutionContext,
    as: string,
    row: DataTableRow,
    index: number,
    value: unknown
): ExecutionContext {
    return {
        ...ctx,
        parent: ctx,
        values: {
            value,
            index,
            [as]: row,
        },
    };
}

/** Renders text or children from a DataHeader or DataCell slot node. */
function renderDataSlotContent(node: ASTNode, ctx: ExecutionContext): ReactNode {
    const slotProps = node.params ?? {};
    const value = slotProps.i18n ? undefined : resolveXmlValue(slotProps, 'value', ctx);

    if (value != null) return String(value);
    if (slotProps.i18n) return resolveTranslation(slotProps, ctx);

    return renderNode(node.children ?? [], ctx);
}

/** Returns the first visible slot node with the requested name. */
function selectVisibleNode(nodes: ASTNode[], name: string, ctx: ExecutionContext): ASTNode | undefined {
    return nodes.find((node) => node.name === name && isVisibleNode(node, ctx));
}

/** Evaluates XML conditional rendering for manually consumed slot nodes. */
function isVisibleNode(node: ASTNode, ctx: ExecutionContext): boolean {
    if (node.params?.if == null) return true;

    return Boolean(evaluate(node.params.if, ctx));
}

/** Resolves a dotted field path against a data row. */
function resolveFieldValue(row: DataTableRow, field: string): unknown {
    return field.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') return undefined;

        return readSafeProperty(current, segment);
    }, row);
}

/** Converts simple shorthand cell values into display text. */
function formatDataValue(value: unknown): string {
    return value == null ? '' : String(value);
}

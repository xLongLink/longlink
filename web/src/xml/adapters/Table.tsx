import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';
import {
    Table as AstryxTable,
    pixel,
    proportional,
    type TableColumn as AstryxTableColumn,
} from '@astryxdesign/core/Table';
import type { ASTNode, ExecutionContext, Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { resolveTranslation } from '@/xml/core/i18n';
import { BaseUrlContext, useUrl } from '@/xml/core/url';
import { evaluate, readSafeProperty } from '@/xml/expressions';
import { ContextProvider, useXmlContext } from '@/xml/core/context';
import {
    readXmlProp,
    requireXmlString,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlNumber,
    resolveXmlString,
    resolveXmlValue,
} from './props';

type TableRow = Record<string, unknown>;

/** Renders XML row data through the Astryx data-driven Table API. */
export function Table({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const baseUrl = useUrl('');

    // Require an explicit array data source.
    if (!readXmlProp(props, 'data')?.trim()) {
        throw new Error('Table requires a data attribute');
    }

    const data = resolveXmlValue(props, 'data', ctx);
    const rows = Array.isArray(data)
        ? data.filter((row): row is TableRow => row != null && typeof row === 'object' && !Array.isArray(row))
        : [];
    const rowName = resolveXmlString(props, 'rowName', ctx, 'row');
    const columns = nodes
        .filter((node) => node.name === 'TableColumn' && isVisibleNode(node, ctx))
        .map((node) => buildColumn(node, ctx, rowName, rows, baseUrl));

    // Astryx tables need at least one visible column definition.
    if (columns.length === 0) {
        throw new Error('Table requires at least one TableColumn');
    }

    const density = resolveXmlEnum(props, 'density', ctx, ['compact', 'balanced', 'spacious'], 'balanced', 'Table');
    const dividers = resolveXmlEnum(props, 'dividers', ctx, ['rows', 'columns', 'grid', 'none'], 'rows', 'Table');
    const verticalAlign = resolveXmlEnum(props, 'verticalAlign', ctx, ['middle', 'top', 'bottom'], 'middle', 'Table');
    const textOverflow = resolveXmlEnum(props, 'textOverflow', ctx, ['wrap', 'truncate'], 'wrap', 'Table');
    const emptyLabel = props.emptyLabel == null ? 'No data' : requireXmlString(props, 'emptyLabel', ctx, 'Table');

    return (
        <AstryxTable
            columns={columns}
            data={rows}
            density={density}
            dividers={dividers}
            emptyState={<Text type="supporting">{emptyLabel}</Text>}
            hasHover={resolveXmlBoolean(props, 'hasHover', ctx, false)}
            idKey={resolveXmlString(props, 'idKey', ctx) || undefined}
            isStriped={resolveXmlBoolean(props, 'isStriped', ctx, false)}
            textOverflow={textOverflow}
            verticalAlign={verticalAlign}
        />
    );
}

/** Marks a data column consumed by its nearest Table. */
export function TableColumn(): never {
    throw new Error('TableColumn must be used inside Table');
}

/** Converts one XML column into an Astryx column with an optional renderCell callback. */
function buildColumn(
    node: ASTNode,
    ctx: ExecutionContext,
    rowName: string,
    rows: TableRow[],
    baseUrl: string
): AstryxTableColumn<TableRow> {
    const props = node.params ?? {};
    const key = readXmlProp(props, 'key');

    // Column keys and field paths are literal identifiers, not expressions.
    if (!key?.trim()) throw new Error('TableColumn requires a string key');

    const field = readXmlProp(props, 'field') ?? key;
    if (!/^[^.\s]+(?:\.[^.\s]+)*$/.test(field)) {
        throw new Error('TableColumn requires a usable field path');
    }
    const header = props.i18n ? resolveTranslation(props, ctx) : resolveXmlString(props, 'header', ctx, key);
    const widthValue = resolveXmlNumber(props, 'width', ctx);
    const widthType = resolveXmlEnum(props, 'widthType', ctx, ['proportional', 'pixel'], 'proportional', 'TableColumn');
    const minWidth = resolveXmlNumber(props, 'minWidth', ctx);
    const width =
        widthValue == null
            ? undefined
            : widthType === 'pixel'
              ? pixel(widthValue)
              : proportional(widthValue, minWidth == null ? undefined : { minWidth });
    const align = resolveXmlEnum(props, 'align', ctx, ['start', 'center', 'end'], 'start', 'TableColumn');
    const cellNodes = node.children ?? [];

    return {
        align,
        header,
        key,
        width,
        renderCell: (row) => renderCell(cellNodes, row, rows.indexOf(row), field, ctx, rowName, baseUrl),
    };
}

/** Renders a column cell with row, index, and field value in lexical XML scope. */
function renderCell(
    nodes: ASTNode[],
    row: TableRow,
    index: number,
    field: string,
    ctx: ExecutionContext,
    rowName: string,
    baseUrl: string
): ReactNode {
    const value = resolveFieldValue(row, field);

    // Shorthand columns render the resolved field value directly.
    if (nodes.length === 0) return value == null ? '' : String(value);

    const rowCtx: ExecutionContext = {
        ...ctx,
        parent: ctx,
        values: { index, value, [rowName]: row },
    };

    return (
        <ContextProvider value={rowCtx}>
            <BaseUrlContext.Provider value={baseUrl}>{renderNode(nodes, rowCtx)}</BaseUrlContext.Provider>
        </ContextProvider>
    );
}

/** Resolves a dotted field path against one row without unsafe property access. */
function resolveFieldValue(row: TableRow, field: string): unknown {
    return field.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') return undefined;

        return readSafeProperty(current, segment);
    }, row);
}

/** Evaluates conditional rendering for an adapter-consumed column node. */
function isVisibleNode(node: ASTNode, ctx: ExecutionContext): boolean {
    if (node.params?.if == null) return true;

    return Boolean(evaluate(node.params.if, ctx));
}

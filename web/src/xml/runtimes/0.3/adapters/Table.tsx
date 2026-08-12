import { Table as AstryxTable, type TableColumn as AstryxTableColumn } from '@astryxdesign/core-0-3/Table';
import { Text } from '@astryxdesign/core-0-3/Text';
import { useXmlRuntime, XmlContext } from '../core/context';
import { renderNode } from '../core/node';
import {
    readXmlProp,
    isVisibleXmlNode,
    requireXmlString,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlString,
    resolveXmlValue,
} from '../core/props';
import { readSafeProperty } from '../expressions';
import type { ASTNode, Props, Scope } from '../types';

type TableRow = Record<string, unknown>;

/** Renders XML row data through the Astryx data-driven Table API. */
export function Table({ props, nodes }: Props) {
    const runtime = useXmlRuntime();
    const ctx = runtime.scope;

    // Require an explicit array data source.
    if (!readXmlProp(props, 'data')) {
        throw new Error('Table requires a data attribute');
    }

    const data = resolveXmlValue(props, 'data', ctx);
    const rows = Array.isArray(data)
        ? data.filter((row): row is TableRow => row != null && typeof row === 'object' && !Array.isArray(row))
        : [];
    const columns = nodes
        .filter((node) => node.name === 'TableColumn' && isVisibleXmlNode(node, ctx))
        .map((node) => buildColumn(node, ctx, runtime.services, rows));

    // Astryx tables need at least one visible column definition.
    if (columns.length === 0) {
        throw new Error('Table requires at least one TableColumn');
    }

    const density = resolveXmlEnum(props, 'density', ctx, ['compact', 'balanced', 'spacious'], 'balanced', 'Table');
    const dividers = resolveXmlEnum(props, 'dividers', ctx, ['rows', 'columns', 'grid', 'none'], 'rows', 'Table');
    const verticalAlign = resolveXmlEnum(props, 'verticalAlign', ctx, ['middle', 'top', 'bottom'], 'middle', 'Table');
    const textOverflow = resolveXmlEnum(props, 'textOverflow', ctx, ['wrap', 'truncate'], 'wrap', 'Table');
    return (
        <AstryxTable
            columns={columns}
            data={rows}
            density={density}
            dividers={dividers}
            emptyState={
                <Text type="supporting">
                    {props.emptyLabel == null ? 'No data' : requireXmlString(props, 'emptyLabel', ctx, 'Table')}
                </Text>
            }
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
    ctx: Scope,
    services: ReturnType<typeof useXmlRuntime>['services'],
    rows: TableRow[]
): AstryxTableColumn<TableRow> {
    const props = node.params ?? {};
    const key = readXmlProp(props, 'key');

    // Column keys and field paths are literal identifiers, not expressions.
    if (key?.kind !== 'text' || !key.value.trim()) throw new Error('TableColumn requires a string key');

    const fieldAttribute = readXmlProp(props, 'field');
    if (fieldAttribute != null && fieldAttribute.kind !== 'text') {
        throw new Error('TableColumn requires a usable field path');
    }
    const field = fieldAttribute?.value ?? key.value;
    if (!/^[^.\s]+(?:\.[^.\s]+)*$/.test(field)) {
        throw new Error('TableColumn requires a usable field path');
    }
    const header = resolveXmlString(props, 'header', ctx) ?? key.value;
    const align = resolveXmlEnum(props, 'align', ctx, ['start', 'center', 'end'], 'start', 'TableColumn');
    const cellNodes = node.children;

    return {
        align,
        header,
        key: key.value,
        renderCell: (row) => {
            const value = field.split('.').reduce<unknown>((current, segment) => {
                if (current == null || typeof current !== 'object') return undefined;

                return readSafeProperty(current, segment);
            }, row);

            // Shorthand columns render the resolved field value directly.
            if (cellNodes.length === 0) return value == null ? '' : String(value);

            const rowCtx: Scope = {
                parent: ctx,
                bindings: { index: rows.indexOf(row), row, value },
            };

            return (
                <XmlContext.Provider value={{ scope: rowCtx, services }}>
                    {renderNode(cellNodes, rowCtx)}
                </XmlContext.Provider>
            );
        },
    };
}

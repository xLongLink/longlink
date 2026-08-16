import { Text } from '@astryxdesign/core/Text';
import { Table as AstryxTable, type TableColumn as AstryxTableColumn } from '@astryxdesign/core/Table';
import type { ASTNode, Props, Scope } from '../types';
import { renderNode } from '../core/node';
import { readSafeProperty } from '../expressions';
import { useXmlRuntime, XmlContext } from '../core/context';
import { readXmlProp, isVisibleXmlNode, requireXmlString, resolveXml, resolveXmlValue } from '../core/props';

type TableRow = Record<string, unknown>;

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

    const idKey = resolveXml(props, 'idKey', ctx);
    return (
        <AstryxTable
            columns={columns}
            data={rows}
            emptyState={
                <Text type="supporting">
                    {props.emptyLabel == null ? 'No data' : requireXmlString(props, 'emptyLabel', ctx, 'Table')}
                </Text>
            }
            idKey={typeof idKey === 'string' ? idKey : undefined}
        />
    );
}

/** Converts one XML column into an Astryx column with an optional renderCell callback. */
function buildColumn(
    node: ASTNode,
    ctx: Scope,
    services: ReturnType<typeof useXmlRuntime>['services'],
    rows: TableRow[]
): AstryxTableColumn<TableRow> {
    const props = node.params;
    const key = readXmlProp(props, 'key');

    // Column keys and field paths are literal identifiers, not expressions.
    if (key?.kind !== 'text' || !key.value.trim()) {
        throw new Error('TableColumn requires a string key');
    }

    const fieldAttribute = readXmlProp(props, 'field');
    if (fieldAttribute != null && fieldAttribute.kind !== 'text') {
        throw new Error('TableColumn requires a usable field path');
    }
    const field = fieldAttribute?.value ?? key.value;
    if (!/^[^.\s]+(?:\.[^.\s]+)*$/.test(field)) {
        throw new Error('TableColumn requires a usable field path');
    }
    const fieldParts = field.split('.');
    const headerValue = resolveXml(props, 'header', ctx);
    const header = typeof headerValue === 'string' ? headerValue : key.value;
    const cellNodes = node.children;

    return {
        header,
        key: key.value,
        renderCell: (row) => {
            const value = fieldParts.reduce<unknown>((current, segment) => readSafeProperty(current, segment), row);

            // Shorthand columns render the resolved field value directly.
            if (cellNodes.length === 0) {
                return value == null ? '' : String(value);
            }

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

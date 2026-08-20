import { renderNode } from '../core/node';
import type { Props, Scope } from '../types';
import { readSafeProperty } from '../expressions/resolve';
import { useXmlRuntime, XmlContext } from '../core/context';
import { Table as AstryxTable, type TableColumn as AstryxTableColumn } from '@astryxdesign/core/Table';
import { readXmlProp, isVisibleXmlNode, resolveXml, resolveXmlValue } from '../core/props';

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
        .map((node): AstryxTableColumn<TableRow> => {
            const columnProps = node.params;
            const fieldAttribute = readXmlProp(columnProps, 'field');
            if (fieldAttribute?.kind !== 'text' || !fieldAttribute.value.trim()) {
                throw new Error('TableColumn requires a usable field path');
            }
            const field = fieldAttribute.value;

            // Column field paths are literal identifiers, not expressions.
            if (!/^[^.\s]+(?:\.[^.\s]+)*$/.test(field)) {
                throw new Error('TableColumn requires a usable field path');
            }
            const fieldParts = field.split('.');
            const headerValue = resolveXml(columnProps, 'header', ctx);
            const header = typeof headerValue === 'string' ? headerValue : field;
            const cellNodes = node.children;

            return {
                header,
                key: field,
                renderCell: (row) => {
                    const value = fieldParts.reduce<unknown>(
                        (current, segment) => readSafeProperty(current, segment),
                        row
                    );

                    // Shorthand columns render the resolved field value directly.
                    if (cellNodes.length === 0) {
                        return value == null ? '' : String(value);
                    }

                    const rowCtx: Scope = {
                        parent: ctx,
                        bindings: { index: rows.indexOf(row), row, value },
                    };

                    return (
                        <XmlContext.Provider value={{ scope: rowCtx, services: runtime.services }}>
                            {renderNode(cellNodes, rowCtx)}
                        </XmlContext.Provider>
                    );
                },
            };
        });

    // Astryx tables need at least one visible column definition.
    if (columns.length === 0) {
        throw new Error('Table requires at least one TableColumn');
    }

    const idKey = resolveXml(props, 'idKey', ctx);
    return (
        <AstryxTable
            columns={columns}
            data={rows}
            emptyState={false}
            idKey={typeof idKey === 'string' ? idKey : undefined}
        />
    );
}

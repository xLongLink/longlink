import { z } from 'zod';
import { renderNode } from '../core/node';
import type { Props, Scope } from '../types';
import { readSafeProperty } from '../expressions/resolve';
import { useXmlRuntime, XmlContext } from '../core/context';
import { readXmlProp, isVisibleXmlNode, resolveXmlProps } from '../core/props';
import { Table as AstryxTable, type TableColumn as AstryxTableColumn } from '@astryxdesign/core/Table';

type TableRow = Record<string, unknown>;

const tablePropsSchema = z.object({ data: z.unknown().optional(), idKey: z.string().optional() });
const tableColumnPropsSchema = z.object({ header: z.string().optional() });

export function Table({ props, nodes }: Props) {
    const runtime = useXmlRuntime();
    const ctx = runtime.scope;

    // Require an explicit array data source.
    if (!readXmlProp(props, 'data')) {
        throw new Error('Table requires a data attribute');
    }

    const { data, idKey } = resolveXmlProps(props, ctx, { data: 'raw', idKey: 'scalar' }, tablePropsSchema);
    const rows = Array.isArray(data)
        ? data.filter((row): row is TableRow => row != null && typeof row === 'object' && !Array.isArray(row))
        : [];
    const columns = nodes
        .filter((node) => node.name === 'TableColumn' && isVisibleXmlNode(node, ctx))
        .map((node): AstryxTableColumn<TableRow> => {
            const columnProps = node.params;
            const fieldAttribute = readXmlProp(columnProps, 'field');

            // Column field paths are literal identifiers, not expressions.
            if (fieldAttribute?.kind !== 'text' || !/^[^.\s]+(?:\.[^.\s]+)*$/.test(fieldAttribute.value)) {
                throw new Error('TableColumn requires a usable field path');
            }
            const field = fieldAttribute.value;
            const fieldParts = field.split('.');
            const { header: headerValue } = resolveXmlProps(
                columnProps,
                ctx,
                { header: 'scalar' },
                tableColumnPropsSchema
            );
            const header = headerValue ?? field;
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

    return <AstryxTable columns={columns} data={rows} emptyState={false} idKey={idKey} />;
}

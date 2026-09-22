import { z } from 'zod';
import { renderNode } from '../core/node';
import type { Props, Scope } from '../types';
import { TABLE_COLUMN_ALIGNS } from '../constants';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useXmlRuntime, XmlContext } from '../core/context';
import { isSafePropertyName, readSafeProperty } from '../expressions/resolve';
import { readXmlProp, isVisibleXmlNode, resolveXmlProps } from '../core/props';
import { Table as AstryxTable, type TableColumn as AstryxTableColumn } from '@astryxdesign/core/Table';

const tablePropsSchema = z.object({
    data: z.array(z.record(z.string(), z.unknown())),
    hasHover: z.boolean().default(false),
    idKey: z.string().optional(),
});
const tableColumnPropsSchema = z.object({
    align: z.enum(TABLE_COLUMN_ALIGNS).optional(),
    header: z.string().optional(),
});

export function Table({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    const { data, hasHover, idKey } = resolveXmlProps(props, ctx, tablePropsSchema, ['data']);
    const columnNodes = nodes.filter((node) => node.name === 'TableColumn' && isVisibleXmlNode(node, ctx));
    const idKeyParts = idKey?.split('.');

    // Keep identifier paths constrained to safe static object keys.
    if (idKeyParts?.some((part) => part === '' || /\s/.test(part) || !isSafePropertyName(part)) === true) {
        throw new Error('Table idKey requires a usable field path');
    }

    // Index rows only when visible rich cells need their original positions.
    const rowIndexes = new Map<Record<string, unknown>, number>();
    if (columnNodes.some((node) => node.children.length > 0)) {
        for (const [index, row] of data.entries()) {
            if (!rowIndexes.has(row)) rowIndexes.set(row, index);
        }
    }

    const columns = columnNodes.map((node): AstryxTableColumn<Record<string, unknown>> => {
        const columnProps = node.params;
        const fieldAttribute = readXmlProp(columnProps, 'field');

        // Column field paths are static identifiers, not runtime values.
        if (
            !fieldAttribute ||
            (fieldAttribute.kind !== 'text' && fieldAttribute.kind !== 'path') ||
            (fieldAttribute.kind === 'path' && fieldAttribute.isBinding)
        ) {
            throw new Error('TableColumn requires a usable field path');
        }
        const fieldParts = fieldAttribute.kind === 'text' ? fieldAttribute.value.split('.') : fieldAttribute.parts;
        if (fieldParts.some((part) => !part || /\s/.test(part))) {
            throw new Error('TableColumn requires a usable field path');
        }
        const field = fieldParts.join('.');
        const { align, header: headerValue } = resolveXmlProps(columnProps, ctx, tableColumnPropsSchema);
        const header = headerValue ?? field;

        return {
            align,
            header,
            key: field,
            renderCell: (row) => {
                const value = fieldParts.reduce(readSafeProperty, row);

                // Shorthand columns render the resolved field value directly.
                if (node.children.length === 0) {
                    return String(value ?? '');
                }

                const rowCtx: Scope = {
                    parent: ctx,
                    bindings: { index: rowIndexes.get(row) ?? -1, row, value },
                };

                return (
                    <XmlContext.Provider value={{ scope: rowCtx, services }}>
                        {renderNode(node.children, rowCtx)}
                    </XmlContext.Provider>
                );
            },
        };
    });

    // Astryx tables need at least one visible column definition.
    if (columns.length === 0) {
        throw new Error('Table requires at least one TableColumn');
    }

    return (
        <AstryxTable
            columns={columns}
            data={data}
            density="compact"
            emptyState={<EmptyState title="Nothing to show here" isCompact />}
            hasHover={hasHover}
            idKey={
                idKeyParts
                    ? (row) => {
                          const value = idKeyParts.reduce(readSafeProperty, row);

                          if (typeof value !== 'string' && typeof value !== 'number') {
                              throw new Error('Table idKey must resolve to a string or number');
                          }

                          return value;
                      }
                    : undefined
            }
        />
    );
}

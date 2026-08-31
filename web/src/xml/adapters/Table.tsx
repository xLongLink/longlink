import { z } from 'zod';
import { renderNode } from '../core/node';
import type { Props, Scope } from '../types';
import { readSafeProperty } from '../expressions/resolve';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useXmlRuntime, XmlContext } from '../core/context';
import { readXmlProp, isVisibleXmlNode, resolveXmlProps } from '../core/props';
import { Table as AstryxTable, type TableColumn as AstryxTableColumn } from '@astryxdesign/core/Table';

const tablePropsSchema = z.object({ data: z.array(z.record(z.string(), z.unknown())), idKey: z.string().optional() });
const tableColumnPropsSchema = z.object({ header: z.string().optional() });

export function Table({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    const { data, idKey } = resolveXmlProps(props, ctx, { data: 'raw', idKey: 'scalar' }, tablePropsSchema);

    const columns = nodes
        .filter((node) => node.name === 'TableColumn' && isVisibleXmlNode(node, ctx))
        .map((node): AstryxTableColumn<Record<string, unknown>> => {
            const columnProps = node.params;
            const fieldAttribute = readXmlProp(columnProps, 'field');

            // Column field paths are static identifiers, not runtime values.
            if (
                (fieldAttribute?.kind !== 'text' && fieldAttribute?.kind !== 'path') ||
                (fieldAttribute?.kind === 'path' && fieldAttribute.isBinding)
            ) {
                throw new Error('TableColumn requires a usable field path');
            }
            const fieldParts = fieldAttribute.kind === 'text' ? fieldAttribute.value.split('.') : fieldAttribute.parts;
            if (fieldParts.some((part) => !part || /\s/.test(part))) {
                throw new Error('TableColumn requires a usable field path');
            }
            const field = fieldParts.join('.');
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
                    const value = fieldParts.reduce(readSafeProperty, row);

                    // Shorthand columns render the resolved field value directly.
                    if (cellNodes.length === 0) {
                        return String(value ?? '');
                    }

                    const rowCtx: Scope = {
                        parent: ctx,
                        bindings: { index: data.indexOf(row), row, value },
                    };

                    return (
                        <XmlContext.Provider value={{ scope: rowCtx, services }}>
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

    return (
        <AstryxTable
            columns={columns}
            data={data}
            density="compact"
            emptyState={<EmptyState title="Nothing to show here" isCompact />}
            idKey={idKey}
        />
    );
}

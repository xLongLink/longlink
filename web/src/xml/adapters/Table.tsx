import {
    Table as UITable,
    TableBody as UITableBody,
    TableCell as UITableCell,
    TableFooter as UITableFooter,
    TableHead as UITableHead,
    TableHeader as UITableHeader,
    TableRow as UITableRow,
} from '@ui/table';
import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlValue } from './props';

/** Renders the shadcn-backed table shell. */
export function Table({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITable>{renderNode(nodes, ctx)}</UITable>;
}

/** Renders the table header slot. */
export function Thead({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableHeader>{renderNode(nodes, ctx)}</UITableHeader>;
}

/** Renders the table body slot. */
export function Tbody({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableBody>{renderNode(nodes, ctx)}</UITableBody>;
}

/** Renders the table footer slot. */
export function Tfoot({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableFooter>{renderNode(nodes, ctx)}</UITableFooter>;
}

/** Renders a single table row. */
export function Tr({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableRow>{renderNode(nodes, ctx)}</UITableRow>;
}

/** Renders a table header cell. */
export function Th({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const text = value != null ? String(value) : props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UITableHead>{text}</UITableHead>;
}

/** Renders a table body cell. */
export function Td({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const text = value != null ? String(value) : props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <UITableCell>{text}</UITableCell>;
}

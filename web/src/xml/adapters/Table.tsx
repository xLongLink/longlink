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
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Renders the shadcn-backed table shell. */
export function Table({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITable>{renderNode(nodes, ctx)}</UITable>;
}

/** Renders the table header slot. */
export function Thead({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableHeader>{renderNode(nodes, ctx)}</UITableHeader>;
}

/** Renders the table body slot. */
export function Tbody({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableBody>{renderNode(nodes, ctx)}</UITableBody>;
}

/** Renders the table footer slot. */
export function Tfoot({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableFooter>{renderNode(nodes, ctx)}</UITableFooter>;
}

/** Renders a single table row. */
export function Tr({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableRow>{renderNode(nodes, ctx)}</UITableRow>;
}

/** Renders a table header cell. */
export function Th({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableHead>{renderNode(nodes, ctx)}</UITableHead>;
}

/** Renders a table body cell. */
export function Td({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UITableCell>{renderNode(nodes, ctx)}</UITableCell>;
}

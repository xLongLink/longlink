import {
    Table as UITable,
    TableBody as UITableBody,
    TableCell as UITableCell,
    TableFooter as UITableFooter,
    TableHead as UITableHead,
    TableHeader as UITableHeader,
    TableRow as UITableRow,
} from '@ui/table';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Table component. */
export interface TableProps extends Props {}

/** Props accepted by the XML TableHeader component. */
export interface TableHeaderProps extends Props {}

/** Props accepted by the XML TableBody component. */
export interface TableBodyProps extends Props {}

/** Props accepted by the XML TableFooter component. */
export interface TableFooterProps extends Props {}

/** Props accepted by the XML TableRow component. */
export interface TableRowProps extends Props {}

/** Props accepted by the XML TableHead component. */
export interface TableHeadProps extends Props {}

/** Props accepted by the XML TableCell component. */
export interface TableCellProps extends Props {}

/** Renders the shadcn-backed table shell. */
export function Table({ props, nodes }: TableProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITable>{renderNode(children ?? [], ctx)}</UITable>;
}

/** Renders the table header slot. */
export function TableHeader({ props, nodes }: TableHeaderProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITableHeader>{renderNode(children ?? [], ctx)}</UITableHeader>;
}

/** Renders the table body slot. */
export function TableBody({ props, nodes }: TableBodyProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITableBody>{renderNode(children ?? [], ctx)}</UITableBody>;
}

/** Renders the table footer slot. */
export function TableFooter({ props, nodes }: TableFooterProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITableFooter>{renderNode(children ?? [], ctx)}</UITableFooter>;
}

/** Renders a single table row. */
export function TableRow({ props, nodes }: TableRowProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITableRow>{renderNode(children ?? [], ctx)}</UITableRow>;
}

/** Renders a table header cell. */
export function TableHead({ props, nodes }: TableHeadProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITableHead>{renderNode(children ?? [], ctx)}</UITableHead>;
}

/** Renders a table body cell. */
export function TableCell({ props, nodes }: TableCellProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UITableCell>{renderNode(children ?? [], ctx)}</UITableCell>;
}

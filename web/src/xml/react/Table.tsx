import {
    Table as UITable,
    TableBody as UITableBody,
    TableCell as UITableCell,
    TableFooter as UITableFooter,
    TableHead as UITableHead,
    TableHeader as UITableHeader,
    TableRow as UITableRow,
} from '@ui/table';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Table component. */
export interface TableProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML TableHeader component. */
export interface TableHeaderProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML TableBody component. */
export interface TableBodyProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML TableFooter component. */
export interface TableFooterProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML TableRow component. */
export interface TableRowProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML TableHead component. */
export interface TableHeadProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML TableCell component. */
export interface TableCellProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders the shadcn-backed table shell. */
export function Table({ children, className: _className }: TableProps) {
    const { ctx } = useXmlContext();

    return <UITable>{renderNode(children ?? [], ctx)}</UITable>;
}

/** Renders the table header slot. */
export function TableHeader({ children, className: _className }: TableHeaderProps) {
    const { ctx } = useXmlContext();

    return <UITableHeader>{renderNode(children ?? [], ctx)}</UITableHeader>;
}

/** Renders the table body slot. */
export function TableBody({ children, className: _className }: TableBodyProps) {
    const { ctx } = useXmlContext();

    return <UITableBody>{renderNode(children ?? [], ctx)}</UITableBody>;
}

/** Renders the table footer slot. */
export function TableFooter({ children, className: _className }: TableFooterProps) {
    const { ctx } = useXmlContext();

    return <UITableFooter>{renderNode(children ?? [], ctx)}</UITableFooter>;
}

/** Renders a single table row. */
export function TableRow({ children, className: _className }: TableRowProps) {
    const { ctx } = useXmlContext();

    return <UITableRow>{renderNode(children ?? [], ctx)}</UITableRow>;
}

/** Renders a table header cell. */
export function TableHead({ children, className: _className }: TableHeadProps) {
    const { ctx } = useXmlContext();

    return <UITableHead>{renderNode(children ?? [], ctx)}</UITableHead>;
}

/** Renders a table body cell. */
export function TableCell({ children, className: _className }: TableCellProps) {
    const { ctx } = useXmlContext();

    return <UITableCell>{renderNode(children ?? [], ctx)}</UITableCell>;
}

import {
    Table as UITable,
    TableBody as UITableBody,
    TableCaption as UITableCaption,
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
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML TableHeader component. */
export interface TableHeaderProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML TableBody component. */
export interface TableBodyProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML TableFooter component. */
export interface TableFooterProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML TableRow component. */
export interface TableRowProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML TableHead component. */
export interface TableHeadProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML TableCell component. */
export interface TableCellProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML TableCaption component. */
export interface TableCaptionProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders the shadcn-backed table shell. */
export function Table({ children, className }: TableProps) {
    const { ctx } = useXmlContext();

    return (
        <UITable className={className}>
            {renderNode(children ?? null, ctx)}
        </UITable>
    );
}


/** Renders the table header slot. */
export function TableHeader({ children, className }: TableHeaderProps) {
    const { ctx } = useXmlContext();

    return <UITableHeader className={className}>{renderNode(children ?? null, ctx)}</UITableHeader>;
}


/** Renders the table body slot. */
export function TableBody({ children, className }: TableBodyProps) {
    const { ctx } = useXmlContext();

    return <UITableBody className={className}>{renderNode(children ?? null, ctx)}</UITableBody>;
}


/** Renders the table footer slot. */
export function TableFooter({ children, className }: TableFooterProps) {
    const { ctx } = useXmlContext();

    return <UITableFooter className={className}>{renderNode(children ?? null, ctx)}</UITableFooter>;
}


/** Renders a single table row. */
export function TableRow({ children, className }: TableRowProps) {
    const { ctx } = useXmlContext();

    return <UITableRow className={className}>{renderNode(children ?? null, ctx)}</UITableRow>;
}


/** Renders a table header cell. */
export function TableHead({ children, className }: TableHeadProps) {
    const { ctx } = useXmlContext();

    return <UITableHead className={className}>{renderNode(children ?? null, ctx)}</UITableHead>;
}


/** Renders a table body cell. */
export function TableCell({ children, className }: TableCellProps) {
    const { ctx } = useXmlContext();

    return <UITableCell className={className}>{renderNode(children ?? null, ctx)}</UITableCell>;
}


/** Renders the table caption slot. */
export function TableCaption({ children, className }: TableCaptionProps) {
    const { ctx } = useXmlContext();

    return <UITableCaption className={className}>{renderNode(children ?? null, ctx)}</UITableCaption>;
}

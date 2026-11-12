import { Pagination as AstryxPagination } from '@/components/astryx/Pagination';

/** Navigates pages of table or gallery items without owning their data or selection. */
export function Pagination(props: {
    /** Current page number, starting at 1. */
    page: number;
    /** Receives the selected page number. */
    onPageChange: (page: number) => void;
    totalItems: number;
    pageSize: number;
    /** Accessible navigation label; defaults to Astryx's localized Pagination label. */
    label?: string;
}) {
    // Delegate page counts, navigation controls, and accessibility to Astryx.
    return (
        <AstryxPagination
            page={props.page}
            onChange={props.onPageChange}
            totalItems={props.totalItems}
            pageSize={props.pageSize}
            label={props.label}
        />
    );
}

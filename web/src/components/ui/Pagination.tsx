import { useState } from 'react';
import { Button } from '@/components/shadcn/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Navigates pages of table or gallery items without owning their data or selection. */
export function Pagination(props: {
    /** Current page number, starting at 1. */
    page: number;
    /** Receives the selected page number. */
    onPageChange: (page: number) => void;
    totalItems: number;
    pageSize: number;
    /** Accessible navigation label; defaults to Pagination. */
    label?: string;
}) {
    const [announcement, setAnnouncement] = useState('');
    const { page } = props;

    // Keep page counts finite and retain the existing positive-integer page-size fallback.
    const pageSize = Number.isFinite(props.pageSize) ? Math.max(1, Math.floor(props.pageSize)) : 10;
    const totalPages = Math.ceil(props.totalItems / pageSize);

    if (!Number.isFinite(totalPages) || totalPages <= 0) return null;

    // Keep long collections bounded while retaining direct access to their first and last pages.
    const start = totalPages <= 7 || page <= 4 ? 1 : page >= totalPages - 3 ? totalPages - 4 : page - 1;

    const end = totalPages <= 7 ? totalPages : page <= 4 ? 5 : page >= totalPages - 3 ? totalPages : page + 1;

    const pages: (number | 'before' | 'after')[] = [];

    if (start > 1) pages.push(1, 'before');
    pages.push(...Array.from({ length: Math.min(7, end - start + 1) }, (_, index) => start + index));

    if (end < totalPages) pages.push('after', totalPages);

    /** Notify the owner synchronously and announce only user-driven navigation. */
    function select(target: number) {
        const nextPage = Math.min(totalPages, Math.max(1, target));
        props.onPageChange(nextPage);
        setAnnouncement(`Page ${nextPage} of ${totalPages}`);
    }

    // Native buttons change local data rather than pretending that each page has a URL.
    return (
        <nav className="view-pagination" aria-label={props.label ?? 'Pagination'}>
            <div className="view-pagination-controls">
                <Button
                    type="button"
                    variant="view"
                    data-variant="ghost"
                    data-size="md"
                    data-icon-only
                    aria-label="Go to previous page"
                    disabled={page <= 1}
                    focusableWhenDisabled
                    onClick={() => select(page - 1)}
                >
                    <ChevronLeft
                        className="view-action-icon view-pagination-chevron"
                        data-size="md"
                        aria-hidden="true"
                    />
                </Button>
                {pages.map((item) =>
                    item !== 'before' && item !== 'after' ? (
                        <Button
                            key={item}
                            type="button"
                            variant="view"
                            data-variant="ghost"
                            data-size="md"
                            aria-label={`Go to page ${item}`}
                            aria-current={item === page ? 'page' : undefined}
                            onClick={() => select(item)}
                        >
                            {item}
                        </Button>
                    ) : (
                        <span key={item} className="view-pagination-ellipsis" aria-hidden="true">
                            …
                        </span>
                    )
                )}
                <Button
                    type="button"
                    variant="view"
                    data-variant="ghost"
                    data-size="md"
                    data-icon-only
                    aria-label="Go to next page"
                    disabled={page >= totalPages}
                    focusableWhenDisabled
                    onClick={() => select(page + 1)}
                >
                    <ChevronRight
                        className="view-action-icon view-pagination-chevron"
                        data-size="md"
                        aria-hidden="true"
                    />
                </Button>
            </div>
            <span className="sr-only" role="status">
                {announcement}
            </span>
        </nav>
    );
}

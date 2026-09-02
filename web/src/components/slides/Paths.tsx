import { Cube } from '@/components/svg/Cube';

/** Renders the opening diagram contrasting transparent and opaque solutions. */
export function PathsSlide() {
    return (
        <svg
            aria-hidden="true"
            className="h-full w-full text-primary"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 1000 600"
        >
            <path d="M100 300H450M450 300L720 144M450 300L720 456" stroke="currentColor" strokeWidth="4" />
            <path d="M720 144L684 146L700 174Z" fill="currentColor" />
            <path d="M720 456L700 426L684 454Z" fill="currentColor" />

            <Cube fill="none" height="160" stroke="currentColor" strokeWidth="0.4" width="160" x="720" y="40" />
            <Cube height="160" width="160" x="720" y="405" />
        </svg>
    );
}

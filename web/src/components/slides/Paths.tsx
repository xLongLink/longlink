import { BlackBox, TransparentBox } from '@/components/svg/Box';

/** Renders the opening split-arrow diagram. */
export function PathsSlide() {
    return (
        <svg
            aria-hidden="true"
            className="h-full w-full text-primary"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 1000 600"
        >
            <path d="M100 300H500M500 300L691 213M500 300L691 387" stroke="currentColor" strokeWidth="4" />
            <path d="M720 200L684 199L697 228Z" fill="currentColor" />
            <path d="M720 400L697 372L684 401Z" fill="currentColor" />
            <TransparentBox height="210" width="238" x="700" y="67" />
            <BlackBox height="210" width="238" x="700" y="303" />
        </svg>
    );
}

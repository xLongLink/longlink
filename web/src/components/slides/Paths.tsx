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
            <path d="M100 300H500M500 300L692 189M500 300L692 411" stroke="currentColor" strokeWidth="4" />
            <path d="M720 173L684 175L700 203Z" fill="currentColor" />
            <path d="M720 427L700 397L684 425Z" fill="currentColor" />
            <TransparentBox height="210" width="238" x="650" y="51" />
            <BlackBox height="210" width="238" x="650" y="349" />
        </svg>
    );
}

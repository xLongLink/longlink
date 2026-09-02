import { useId, type SVGProps } from 'react';

type BoxSvgProps = SVGProps<SVGSVGElement>;

/** Renders a transparent oblique box with its hidden edges visible. */
export function TransparentBox({ className = '', ...props }: BoxSvgProps) {
    const descriptionId = useId();
    const titleId = useId();

    return (
        <svg
            aria-labelledby={`${titleId} ${descriptionId}`}
            className={`box-art ${className}`.trim()}
            role="img"
            viewBox="0 0 340 300"
            {...props}
        >
            <title id={titleId}>Transparent box</title>
            <desc id={descriptionId}>A transparent oblique cube with all six faces visible.</desc>
            <g fill="currentColor" fillOpacity="0.04">
                <polygon points="150,64 270,64 270,184 150,184" />
                <polygon points="100,220 150,184 270,184 220,220" />
                <polygon points="100,100 150,64 150,184 100,220" />
                <polygon points="100,100 150,64 270,64 220,100" />
                <polygon points="220,100 270,64 270,184 220,220" />
                <polygon points="100,100 220,100 220,220 100,220" />
            </g>
            <path
                d="M150 64H270V184L220 220H100V100L150 64M100 100H220L270 64M220 100V220L270 184"
                fill="none"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="3"
            />
            <g aria-hidden="true" fill="none" opacity="0.5" stroke="currentColor" strokeDasharray="7 7" strokeWidth="3">
                <line x1="150" y1="64" x2="150" y2="184" />
                <line x1="150" y1="184" x2="270" y2="184" />
                <line x1="100" y1="220" x2="150" y2="184" />
            </g>
        </svg>
    );
}

/** Renders an opaque oblique box with three visible faces. */
export function BlackBox({ className = '', ...props }: BoxSvgProps) {
    const descriptionId = useId();
    const titleId = useId();

    return (
        <svg
            aria-labelledby={`${titleId} ${descriptionId}`}
            className={`box-art ${className}`.trim()}
            role="img"
            viewBox="0 0 340 300"
            {...props}
        >
            <title id={titleId}>Black box</title>
            <desc id={descriptionId}>A solid oblique cube showing only its three visible faces.</desc>
            <g stroke="currentColor" strokeLinejoin="round" strokeWidth="3">
                <polygon fill="currentColor" fillOpacity="0.7" points="100,100 150,64 270,64 220,100" />
                <polygon fill="currentColor" fillOpacity="0.85" points="220,100 270,64 270,184 220,220" />
                <polygon fill="currentColor" points="100,100 220,100 220,220 100,220" />
            </g>
        </svg>
    );
}

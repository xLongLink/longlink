import { useId, type SVGProps } from 'react';

/** Renders an arrow connecting two steps in the CLI workflow. */
const CliWorkflowConnector = (props: SVGProps<SVGSVGElement>) => {
    const markerId = useId();

    return (
        <svg {...props} viewBox="0 0 58 44">
            <defs>
                <marker id={markerId} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
                    <path d="M0 0 7 3.5 0 7Z" fill="currentColor" opacity="0.85" />
                </marker>
            </defs>
            <path
                d="M10 2 C2 17 4 30 20 30 H50"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="5"
                className="opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-20 motion-reduce:transition-none"
            />
            <path
                d="M10 2 C2 17 4 30 20 30 H50"
                fill="none"
                markerEnd={`url(#${markerId})`}
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.4"
                className="opacity-55 transition-opacity duration-300 group-hover:opacity-85 motion-reduce:transition-none"
            />
        </svg>
    );
};

export { CliWorkflowConnector };

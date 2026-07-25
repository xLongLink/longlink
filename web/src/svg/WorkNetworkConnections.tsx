import type { SVGProps } from 'react';

/** Renders the connections between LongLink and its work network. */
const WorkNetworkConnections = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 320 160">
        <path
            d="M78 24 C108 28 120 58 132 80 M78 80 H132 M78 136 C108 132 120 102 132 80 M242 24 C212 28 200 58 188 80 M242 80 H188 M242 136 C212 132 200 102 188 80"
            fill="none"
            stroke="#e49aaa"
            strokeLinecap="round"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            className="opacity-40 transition-opacity duration-300 group-hover:opacity-80 motion-reduce:transition-none"
        />
    </svg>
);

export { WorkNetworkConnections };

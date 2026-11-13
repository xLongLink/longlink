import type { ReactNode } from 'react';

/** Owns the application content surface and the View viewport-height contract. */
export default function Content({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
    return (
        <div className="platform-content" data-toolbar={toolbar ? true : undefined}>
            <div className="platform-content-body">
                {toolbar}
                {children}
            </div>
        </div>
    );
}

import type { ReactNode } from 'react';

/** Owns the application content surface and the View viewport-height contract. */
export default function Content({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
    return (
        <div
            className="relative flex min-h-[calc(100dvh-var(--\_app-shell-header-height,0px))] min-w-0 flex-col before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-xl before:bg-background before:content-[''] after:pointer-events-none after:absolute after:inset-2 after:z-0 after:rounded-xl after:bg-card after:content-[''] data-toolbar:[--platform-toolbar-height:calc(calc(var(--spacing)*8)+calc(var(--spacing)*3)*2)]"
            data-toolbar={toolbar ? true : undefined}
        >
            <div className="relative z-10 flex min-w-0 flex-col p-2">
                {toolbar}
                {children}
            </div>
        </div>
    );
}

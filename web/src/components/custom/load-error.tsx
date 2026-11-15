import { CircleX } from 'lucide-react';
import type { ReactNode } from 'react';

/** Presents a failed read while leaving recovery behavior with its caller. */
export function LoadError({
    message,
    className,
    children
}: {
    message: string;
    className: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <div
                role="status"
                className="flex max-w-full items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 font-[inherit] text-destructive-foreground forced-colors:outline forced-colors:outline-offset-[-1px] forced-colors:outline-[CanvasText]"
            >
                <CircleX aria-hidden="true" className="size-5 shrink-0" />
                <p className="m-0 min-w-0 text-sm leading-(--text-sm--line-height) font-semibold wrap-anywhere">
                    {message}
                </p>
            </div>
            {children}
        </div>
    );
}

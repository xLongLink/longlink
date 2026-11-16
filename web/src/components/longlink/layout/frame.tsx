import * as frame from '@/components/reui/frame';
import type { ComponentProps, ReactNode } from 'react';

/** Owns the header, panel, and footer without exposing section styling. */
export function Frame({
    title,
    description,
    action,
    footer,
    padding = 'default',
    children,
    ...props
}: Omit<ComponentProps<typeof frame.Frame>, 'className' | 'style' | 'title'> & {
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    footer?: ReactNode;
    padding?: 'default' | 'none';
}) {
    return (
        <frame.Frame {...props} className="min-w-0" style={undefined}>
            {(title != null || description != null || action != null) && (
                <frame.FrameHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                    {(title != null || description != null) && (
                        <div className="min-w-0">
                            {title != null && <frame.FrameTitle>{title}</frame.FrameTitle>}
                            {description != null && <frame.FrameDescription>{description}</frame.FrameDescription>}
                        </div>
                    )}
                    {action != null && (
                        <div
                            className={
                                title == null && description == null ? 'col-span-2 min-w-0' : 'min-w-0 justify-self-end'
                            }
                        >
                            {action}
                        </div>
                    )}
                </frame.FrameHeader>
            )}
            <frame.FramePanel className={padding === 'none' ? 'p-0' : undefined}>{children}</frame.FramePanel>
            {footer != null && <frame.FrameFooter>{footer}</frame.FrameFooter>}
        </frame.Frame>
    );
}

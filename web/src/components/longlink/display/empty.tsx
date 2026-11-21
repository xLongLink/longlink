import type { ReactNode } from 'react';
import type { IconName } from 'lucide-react/dynamic';
import { Icon } from '@/components/longlink/display/icon';

/** Displays an empty state with optional actions below its description. */
export function Empty({
    icon,
    title,
    description,
    children
}: {
    icon?: IconName | `https://${string}` | `http://${string}` | `/${string}`;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
}) {
    // URL sources render as images; other values are Lucide icon names.
    const isImage = icon !== undefined && /^(https?:\/\/|\/)/.test(icon);

    return (
        <div
            data-slot="empty"
            className="flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center text-balance"
        >
            <div data-slot="empty-header" className="flex max-w-sm flex-col items-center gap-2">
                {icon && (
                    <div
                        data-slot="empty-icon"
                        className="mb-2 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
                        aria-hidden="true"
                    >
                        {isImage ? (
                            <img src={icon} alt="" className="size-4 object-contain" />
                        ) : (
                            <Icon icon={icon as IconName} size="sm" />
                        )}
                    </div>
                )}
                <div data-slot="empty-title" className="text-base font-medium tracking-tight">
                    {title}
                </div>
                {description && (
                    <div
                        data-slot="empty-description"
                        className="text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary"
                    >
                        {description}
                    </div>
                )}
            </div>
            {children && (
                <div
                    data-slot="empty-content"
                    className="flex w-full max-w-sm min-w-0 flex-wrap items-center justify-center gap-2 text-sm text-balance"
                >
                    {children}
                </div>
            )}
        </div>
    );
}

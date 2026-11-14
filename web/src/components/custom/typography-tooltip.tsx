import { useId, useState, type ReactElement } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shadcn/tooltip';

/** Attaches read-only typography details without replacing the semantic trigger element. */
export function TypographyTooltip({
    children,
    content,
    enabled,
    placement = 'above'
}: {
    children: ReactElement;
    content: string;
    enabled: boolean;
    placement?: 'above' | 'below' | 'start' | 'end';
}) {
    const id = useId();
    const [open, setOpen] = useState(false);

    // Keep the native text node mounted when truncation measurements change.
    return (
        <TooltipProvider>
            <Tooltip disabled={!enabled} onOpenChange={setOpen}>
                <TooltipTrigger
                    render={children}
                    tabIndex={undefined}
                    delay={200}
                    aria-describedby={enabled && open ? id : undefined}
                    onFocus={(event) => {
                        // A nonfocusable text wrapper must not treat its child's focus as its own.
                        if (event.target !== event.currentTarget && event.currentTarget.tabIndex < 0) {
                            event.preventBaseUIHandler();
                        }
                    }}
                />
                <TooltipContent
                    id={id}
                    role="tooltip"
                    className="whitespace-normal wrap-anywhere"
                    side={
                        placement === 'above'
                            ? 'top'
                            : placement === 'below'
                              ? 'bottom'
                              : placement === 'start'
                                ? 'inline-start'
                                : 'inline-end'
                    }
                    sideOffset={8}
                >
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

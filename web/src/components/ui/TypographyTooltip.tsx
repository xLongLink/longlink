import { Tooltip } from '@base-ui/react/tooltip';
import { useId, useState, type ReactElement } from 'react';

/** Attaches read-only typography details without replacing the semantic trigger element. */
export function TypographyTooltip({
    children,
    content,
    enabled,
    placement = 'above',
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
        <Tooltip.Root disabled={!enabled} onOpenChange={setOpen}>
            <Tooltip.Trigger
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
            <Tooltip.Portal>
                <Tooltip.Positioner
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
                    <Tooltip.Popup id={id} role="tooltip" className="view-typography-tooltip">
                        {content}
                    </Tooltip.Popup>
                </Tooltip.Positioner>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

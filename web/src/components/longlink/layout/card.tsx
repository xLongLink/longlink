import * as card from '@/components/shadcn/card';
import type { ComponentProps, ReactNode } from 'react';
import { InteractiveCard } from '@/components/custom/interactive-card';

/** Owns card sections and accessible surface interactions without styling overrides. */
export function Card({
    title,
    description,
    action,
    footer,
    padding = 'default',
    children,
    ...props
}: Omit<ComponentProps<typeof InteractiveCard>, 'className' | 'style' | 'title'> & {
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    footer?: ReactNode;
    padding?: 'default' | 'none';
}) {
    return (
        <InteractiveCard {...props} className={padding === 'none' ? 'py-0' : undefined} style={undefined}>
            {(title != null || description != null || action != null) && (
                <card.CardHeader className="gap-x-3 gap-y-0 border-b">
                    {title != null && <card.CardTitle>{title}</card.CardTitle>}
                    {description != null && <card.CardDescription>{description}</card.CardDescription>}
                    {action != null && (
                        <card.CardAction
                            className={
                                title == null && description == null ? 'col-span-2 col-start-1 w-full' : undefined
                            }
                        >
                            {action}
                        </card.CardAction>
                    )}
                </card.CardHeader>
            )}
            <card.CardContent className={padding === 'none' ? 'flex-1 px-0' : 'flex-1'}>{children}</card.CardContent>
            {footer != null && (
                <card.CardFooter className="justify-between gap-2 bg-transparent py-1.5 text-xs text-muted-foreground">
                    {footer}
                </card.CardFooter>
            )}
        </InteractiveCard>
    );
}

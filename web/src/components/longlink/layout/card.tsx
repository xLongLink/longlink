import * as card from '@/components/shadcn/card';
import type { ComponentProps, ReactNode } from 'react';
import { InteractiveCard } from '@/components/custom/interactive-card';

/** Owns card sections and accessible surface interactions without styling overrides. */
export function Card({
    header,
    footer,
    children,
    ...props
}: Omit<ComponentProps<typeof InteractiveCard>, 'className' | 'style'> & {
    header?: { title: ReactNode; description?: ReactNode; action?: ReactNode };
    footer?: ReactNode;
}) {
    return (
        <InteractiveCard {...props} className={undefined} style={undefined}>
            {header != null && (
                <card.CardHeader className="gap-x-3 gap-y-0 border-b">
                    <card.CardTitle>{header.title}</card.CardTitle>
                    {header.description != null && <card.CardDescription>{header.description}</card.CardDescription>}
                    {header.action != null && <card.CardAction>{header.action}</card.CardAction>}
                </card.CardHeader>
            )}
            <card.CardContent>{children}</card.CardContent>
            {footer != null && (
                <card.CardFooter className="justify-between gap-2 bg-transparent py-1.5 text-xs text-muted-foreground">
                    {footer}
                </card.CardFooter>
            )}
        </InteractiveCard>
    );
}

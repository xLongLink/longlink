import * as React from 'react';
import type { IconName } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Icon as UIIcon } from './icon';

type HeroProps = React.ComponentProps<'section'> & {
    icon?: IconName;
};

/**
 * Renders the hero shell with an optional icon and a simple horizontal layout.
 */
function Hero({ className, icon, children, ...props }: HeroProps) {
    const iconNode = icon ? <UIIcon name={icon} className="size-5" /> : null;

    return (
        <section data-slot="hero" className={cn('flex items-center gap-4', className)} {...props}>
            {iconNode ? (
                <div
                    data-slot="hero-icon"
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent [&_svg]:size-5 [&_svg]:stroke-[2.5]"
                >
                    {iconNode}
                </div>
            ) : null}
            <div className="min-w-0 flex-1">{children}</div>
        </section>
    );
}

/** Renders the hero title block. */
function HeroTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="hero-title"
            className={cn('text-lg font-semibold leading-6 tracking-tight sm:text-xl', className)}
            {...props}
        />
    );
}

/** Renders the hero description block. */
function HeroDescription({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="hero-description"
            className={cn('max-w-2xl text-sm leading-5 text-muted-foreground', className)}
            {...props}
        />
    );
}

/** Renders the right-side hero action block. */
function HeroAction({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="hero-action" className={cn('flex shrink-0 items-center gap-3', className)} {...props} />;
}

export { Hero, HeroAction, HeroDescription, HeroTitle };

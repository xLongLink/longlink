import * as LucideIcons from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type HeroProps = React.ComponentProps<'section'> & {
    icon?: React.ReactNode | string;
};

/**
 * Renders the hero shell with an optional icon and a two-column layout.
 */
function Hero({ className, icon, children, ...props }: HeroProps) {
    let iconNode: React.ReactNode = null;

    /* Resolve string icon names so XML callers can reference lucide exports directly. */
    if (typeof icon === 'string') {
        const Icon = LucideIcons[icon as keyof typeof LucideIcons] as React.ComponentType<{
            className?: string;
        }> | null;

        iconNode = Icon ? <Icon aria-hidden="true" className="size-5" /> : null;
    } else {
        iconNode = icon;
    }

    return (
        <section
            data-slot="hero"
            className={cn(
                'grid gap-8 rounded-3xl border border-border/60 bg-muted/20 p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:p-8',
                className
            )}
            {...props}
        >
            {iconNode ? (
                <div
                    data-slot="hero-icon"
                    className="flex size-11 items-center justify-center rounded-2xl bg-background text-foreground ring-1 ring-border/70 [&_svg]:size-5"
                >
                    {iconNode}
                </div>
            ) : null}
            {children}
        </section>
    );
}

/** Renders the hero title block. */
function HeroTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="hero-title"
            className={cn('text-3xl font-semibold tracking-tight sm:text-4xl', className)}
            {...props}
        />
    );
}

/** Renders the hero description block. */
function HeroDescription({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="hero-description"
            className={cn('max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base', className)}
            {...props}
        />
    );
}

/** Renders the right-side hero content block. */
function HeroContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="hero-content"
            className={cn(
                'flex w-full flex-col gap-3 lg:col-start-2 lg:row-start-1 lg:max-w-md lg:justify-self-end',
                className
            )}
            {...props}
        />
    );
}

export { Hero, HeroContent, HeroDescription, HeroTitle };

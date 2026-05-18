import * as LucideIcons from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type HeroProps = React.ComponentProps<'section'> & {
    icon?: React.ReactNode | string;
};

/**
 * Renders the hero shell with an optional icon and a simple horizontal layout.
 */
function Hero({ className, icon, children, ...props }: HeroProps) {
    let iconNode: React.ReactNode = null;

    // Resolve string icon names so XML callers can use lowercase or kebab-case Lucide names.
    if (typeof icon === 'string') {
        const normalizedIcon = icon
            .trim()
            .replace(/(?:^|[-_\s]+)([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
        const Icon = (LucideIcons[icon as keyof typeof LucideIcons] ??
            LucideIcons[normalizedIcon as keyof typeof LucideIcons]) as React.ComponentType<{
            className?: string;
        }> | null;

        iconNode = Icon ? <Icon aria-hidden="true" className="size-5" /> : null;
    } else {
        iconNode = icon;
    }

    return (
        <section data-slot="hero" className={cn('flex items-start gap-4', className)} {...props}>
            {iconNode ? (
                <div
                    data-slot="hero-icon"
                    className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent [&_svg]:size-5"
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
            className={cn('text-2xl font-semibold tracking-tight sm:text-3xl', className)}
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
            className={cn('mt-4 flex w-full flex-row flex-wrap items-center gap-3', className)}
            {...props}
        />
    );
}

export { Hero, HeroContent, HeroDescription, HeroTitle };

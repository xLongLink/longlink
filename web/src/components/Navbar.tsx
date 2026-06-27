import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '@ui/button';

import { Wordmark } from '@/components/Wordmark';
import { cn } from '@/lib/utils';

/** Renders the public landing page navigation. */
export function Navbar() {
    return (
        <header className="relative z-20 px-4 py-5">
            <div className="mx-auto max-w-[620px] rounded-lg border border-border bg-card/80 text-card-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-md dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_60px_rgba(0,0,0,0.35)]">
                <nav
                    className="flex h-11 w-full items-center justify-between gap-4 px-2.5"
                    aria-label="Main navigation"
                >
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-sm font-semibold text-card-foreground"
                        aria-label="LongLink home"
                    >
                        <Wordmark />
                    </Link>

                    <ul className="hidden items-center gap-7 text-[11px] sm:flex">
                        <li className="font-medium transition-colors hover:text-accent">
                            <Link
                                to="/docs"
                                className="whitespace-nowrap text-card-foreground/70 transition-colors hover:text-card-foreground"
                            >
                                Documentation
                            </Link>
                        </li>
                        <li className="font-medium transition-colors hover:text-accent">
                            <Link
                                to="/pricing"
                                className="whitespace-nowrap text-card-foreground/70 transition-colors hover:text-card-foreground"
                            >
                                Pricing
                            </Link>
                        </li>
                        <li className="font-medium transition-colors hover:text-accent">
                            <a
                                href="https://github.com/xLongLink/longlink"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 whitespace-nowrap text-card-foreground/70 transition-colors hover:text-card-foreground"
                            >
                                <span>GitHub</span>
                                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                            </a>
                        </li>
                    </ul>

                    <Link
                        to="/organizations"
                        className={cn(
                            buttonVariants({ size: 'sm' }),
                            'h-7 rounded-md bg-foreground px-3 text-xs text-background hover:bg-foreground/90'
                        )}
                    >
                        Login
                    </Link>
                </nav>
            </div>
        </header>
    );
}

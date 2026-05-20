import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '@ui/button';

import { cn } from '@/lib/utils';

/** Renders the public landing page navigation. */
export function Navbar() {
    return (
        <header className="py-4">
            <div>
                <nav
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-6 lg:grid-cols-3"
                    aria-label="Main navigation"
                >
                    <Link to="/" className="flex items-center gap-2" aria-label="LongLink home">
                        <img src="/favicon.ico" alt="LongLink logo" className="size-8" />
                        LongLink
                    </Link>

                    <ul className="hidden items-center justify-center gap-8 md:flex">
                        <li className="font-medium transition-colors hover:text-accent">
                            <Link
                                to="/playground"
                                className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Playground
                            </Link>
                        </li>
                        <li className="font-medium transition-colors hover:text-accent">
                            <a
                                href="https://docs.longlink.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <span>Docs</span>
                                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                            </a>
                        </li>
                        <li className="font-medium transition-colors hover:text-accent">
                            <a
                                href="https://github.com/xLongLink/longlink"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <span>GitHub</span>
                                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                            </a>
                        </li>
                    </ul>

                    <a href="/auth/login/oidc" className={cn(buttonVariants(), 'ml-auto w-24')}>
                        Get Started
                    </a>
                </nav>
            </div>
        </header>
    );
}

import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '@ui/button';

import { cn } from '@/lib/utils';

/** Renders the public landing page navigation. */
export function Navbar() {
    return (
        <header className="relative z-20 px-4 py-5">
            <div className="mx-auto max-w-[620px] rounded-lg border border-white/15 bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
                <nav
                    className="grid h-11 w-full grid-cols-[1fr_auto] items-center gap-4 px-2.5 sm:grid-cols-[1fr_auto_1fr]"
                    aria-label="Main navigation"
                >
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-sm font-semibold text-white"
                        aria-label="LongLink home"
                    >
                        <img src="/favicon.ico" alt="" className="size-5" aria-hidden="true" />
                        <span>LongLink</span>
                    </Link>

                    <ul className="hidden items-center justify-center gap-7 text-[11px] sm:flex">
                        <li className="font-medium transition-colors hover:text-accent">
                            <Link
                                to="/playground"
                                className="whitespace-nowrap text-white/70 transition-colors hover:text-white"
                            >
                                Playground
                            </Link>
                        </li>
                        <li className="font-medium transition-colors hover:text-accent">
                            <a
                                href="https://docs.longlink.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 whitespace-nowrap text-white/70 transition-colors hover:text-white"
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
                                className="inline-flex items-center gap-1 whitespace-nowrap text-white/70 transition-colors hover:text-white"
                            >
                                <span>GitHub</span>
                                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                            </a>
                        </li>
                    </ul>

                    <a
                        href="/auth/login/oidc"
                        className={cn(
                            buttonVariants({ size: 'sm' }),
                            'ml-auto h-7 rounded-md bg-white px-3 text-xs text-black hover:bg-white/90'
                        )}
                    >
                        Login
                    </a>
                </nav>
            </div>
        </header>
    );
}

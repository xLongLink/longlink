import { Package } from 'lucide-react';

import { GitHub } from '@/svg/GitHub';
import { LinkedIn } from '@/svg/LinkedIn';
import { Link } from 'react-router';

import { Wordmark } from '@/components/Wordmark';

/** Renders the public landing page footer. */
export function Footer() {
    return (
        <footer className="px-4 py-6 md:py-8">
            <div className="mx-auto w-full max-w-[620px] rounded-lg border border-border bg-card/80 px-4 py-3 text-card-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-md dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_60px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
                    <div className="flex items-center gap-5">
                        <Link to="/" className="inline-flex items-center leading-none" aria-label="LongLink home">
                            <Wordmark className="gap-1.5 text-xs" />
                        </Link>

                        <ul className="flex items-center justify-center gap-4 text-muted-foreground">
                            <li>
                                <a
                                    href="https://www.linkedin.com/company/swissgpu"
                                    aria-label="LinkedIn"
                                    title="LinkedIn"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex transition-colors hover:text-accent"
                                >
                                    <LinkedIn className="size-4" />
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/xLongLink/longlink"
                                    aria-label="GitHub"
                                    title="GitHub"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex transition-colors hover:text-accent"
                                >
                                    <GitHub className="size-4" />
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://pypi.org/project/longlink/"
                                    aria-label="PyPI"
                                    title="PyPI"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex transition-colors hover:text-accent"
                                >
                                    <Package className="size-4" />
                                </a>
                            </li>
                        </ul>
                    </div>

                    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground sm:justify-end">
                        <li className="transition-colors hover:text-accent">
                            <Link to="/">Home</Link>
                        </li>
                        <li className="transition-colors hover:text-accent">
                            <Link to="/docs">Documentation</Link>
                        </li>
                        <li className="transition-colors hover:text-accent">
                            <Link to="/pricing">Pricing</Link>
                        </li>
                    </ul>
                </div>

                <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t border-black/10 pt-3 text-center text-[11px] font-medium text-muted-foreground dark:border-white/10 sm:flex-row sm:text-left">
                    <p>LongLink LLC - 2026 - {import.meta.env.VERSION ?? 'v0.0.0'}</p>
                    <ul className="flex items-center gap-4">
                        <li className="transition-colors hover:text-accent">
                            <Link to="/impressum">Impressum</Link>
                        </li>
                        <li className="transition-colors hover:text-accent">
                            <Link to="/terms">Terms</Link>
                        </li>
                        <li className="transition-colors hover:text-accent">
                            <Link to="/privacy">Privacy</Link>
                        </li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}

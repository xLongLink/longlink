import { Package } from 'lucide-react';
import { Wordmark } from '@/components/wordmark';
import { Link as RouterLink } from 'react-router';
import { Separator } from '@/components/shadcn/separator';
import { GitHubIcon } from '@/components/svg/git-hub-icon';
import { LinkedInIcon } from '@/components/svg/linked-in-icon';

/** Renders the public footer at the page's content width. */
export function Footer({ maxWidth = 1000 }: { maxWidth?: number }) {
    return (
        <footer className="border-t border-border px-6 py-10 font-sans [&_a]:inline-flex [&_a]:items-center [&_a]:no-underline [&_a]:hover:underline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-ring [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-offset-2 [&_a:not(.site-footer-home)]:text-muted-foreground [@media(hover:hover)]:[&_a:not(.site-footer-home):hover]:text-[color-mix(in_srgb,var(--muted-foreground),var(--foreground)_15%)]">
            <div className="mx-auto flex w-full flex-col gap-6 max-sm:text-center" style={{ maxWidth }}>
                <div className="flex flex-wrap items-center justify-between gap-4 max-sm:flex-col max-sm:justify-center">
                    <div className="flex items-center gap-4 max-sm:flex-col max-sm:justify-center">
                        <RouterLink className="site-footer-home text-inherit" to="/" aria-label="LongLink home">
                            <Wordmark size="heading" />
                        </RouterLink>
                        <ul className="m-0 flex list-none items-center gap-3 p-0">
                            <li>
                                <a
                                    href="https://www.linkedin.com/company/longlink"
                                    aria-label="LinkedIn"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    <LinkedInIcon aria-hidden="true" className="size-4" />
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/xLongLink/longlink"
                                    aria-label="GitHub"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    <GitHubIcon aria-hidden="true" className="size-4" />
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://pypi.org/project/longlink/"
                                    aria-label="PyPI"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    <Package aria-hidden="true" size={16} />
                                </a>
                            </li>
                        </ul>
                    </div>

                    <nav
                        className="flex flex-wrap items-center justify-center gap-4 text-sm leading-(--text-sm--line-height) font-medium"
                        aria-label="Footer navigation"
                    >
                        <RouterLink to="/docs/">Documentation</RouterLink>
                        <RouterLink to="/blog/">Blog</RouterLink>
                        <RouterLink to="/pricing/">Pricing</RouterLink>
                        <RouterLink to="/login/">Sign In</RouterLink>
                    </nav>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:justify-center">
                    <p className="m-0 text-sm leading-(--text-sm--line-height) font-normal text-muted-foreground max-sm:order-1">
                        LongLink LLC - 2026 - {import.meta.env.VERSION ?? 'v0.0.0'}
                    </p>
                    <nav
                        className="flex flex-wrap items-center justify-center gap-4 text-sm leading-(--text-sm--line-height) font-medium"
                        aria-label="Legal navigation"
                    >
                        <a href="mailto:info@longlink.dev">Contact</a>
                        <RouterLink to="/impressum/">Impressum</RouterLink>
                        <RouterLink to="/terms/">Terms</RouterLink>
                        <RouterLink to="/privacy/">Privacy</RouterLink>
                    </nav>
                </div>
            </div>
        </footer>
    );
}

import { Package } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';
import { Divider } from '@/components/ui/Divider';
import { Link as RouterLink } from 'react-router';
import { GitHubIcon } from '@/components/svg/GitHubIcon';
import { LinkedInIcon } from '@/components/svg/LinkedInIcon';

/** Renders the public footer at the page's content width. */
export function Footer({ maxWidth = 1000 }: { maxWidth?: number }) {
    return (
        <footer className="border-t border-border px-6 py-10 font-sans [&_a]:inline-flex [&_a]:items-center [&_a]:no-underline [&_a]:hover:underline [&_a:focus-visible]:outline-(length:--focus-outline-width) [&_a:focus-visible]:outline-(--focus-outline-color) [&_a:focus-visible]:[outline-style:var(--focus-outline-style)] [&_a:focus-visible]:outline-offset-(--focus-outline-offset) [&_a:not(.site-footer-home)]:text-muted-foreground [@media(hover:hover)]:[&_a:not(.site-footer-home):hover]:text-[color-mix(in_srgb,var(--color-text-secondary),var(--color-tint-hover)_15%)]">
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
                        className="flex flex-wrap items-center justify-center gap-4 text-[length:var(--text-supporting-size)] leading-(--text-supporting-leading) font-medium"
                        aria-label="Footer navigation"
                    >
                        <RouterLink to="/docs/">Documentation</RouterLink>
                        <RouterLink to="/blog/">Blog</RouterLink>
                        <RouterLink to="/pricing/">Pricing</RouterLink>
                        <RouterLink to="/login/">Sign In</RouterLink>
                    </nav>
                </div>

                <Divider />

                <div className="flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:justify-center">
                    <p className="m-0 text-[length:var(--text-supporting-size)] leading-(--text-supporting-leading) font-(--text-supporting-weight) text-muted-foreground max-sm:order-1">
                        LongLink LLC - 2026 - {import.meta.env.VERSION ?? 'v0.0.0'}
                    </p>
                    <nav
                        className="flex flex-wrap items-center justify-center gap-4 text-[length:var(--text-supporting-size)] leading-(--text-supporting-leading) font-medium"
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

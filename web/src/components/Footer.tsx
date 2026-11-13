import { Package } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';
import { Divider } from '@/components/ui/Divider';
import { Link as RouterLink } from 'react-router';
import { GitHubIcon } from '@/components/svg/GitHubIcon';
import { LinkedInIcon } from '@/components/svg/LinkedInIcon';

/** Renders the public footer at the page's content width. */
export function Footer({ maxWidth = 1000 }: { maxWidth?: number }) {
    return (
        <footer className="site-footer">
            <div className="site-footer-content" style={{ maxWidth }}>
                <div className="site-footer-row">
                    <div className="site-footer-brand">
                        <RouterLink className="site-footer-home" to="/" aria-label="LongLink home">
                            <Wordmark size="heading" />
                        </RouterLink>
                        <ul className="site-footer-socials">
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

                    <nav className="site-footer-navigation" aria-label="Footer navigation">
                        <RouterLink to="/docs/">Documentation</RouterLink>
                        <RouterLink to="/blog/">Blog</RouterLink>
                        <RouterLink to="/pricing/">Pricing</RouterLink>
                        <RouterLink to="/login/">Sign In</RouterLink>
                    </nav>
                </div>

                <Divider />

                <div className="site-footer-row site-footer-legal">
                    <p className="site-footer-version">LongLink LLC - 2026 - {import.meta.env.VERSION ?? 'v0.0.0'}</p>
                    <nav className="site-footer-navigation" aria-label="Legal navigation">
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

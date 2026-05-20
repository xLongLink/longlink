import { Github, Linkedin, Package } from 'lucide-react';
import { Link } from 'react-router';

const socialLinks = [
    {
        href: 'https://www.linkedin.com/company/swissgpu',
        label: 'LinkedIn',
        icon: Linkedin,
    },
    {
        href: 'https://github.com/xLongLink/longlink',
        label: 'GitHub',
        icon: Github,
    },
    {
        href: 'https://pypi.org/project/longlink/',
        label: 'PyPI',
        icon: Package,
    },
];

const navigationLinks = [
    {
        label: 'Home',
        href: '/',
    },
    {
        label: 'Playground',
        href: '/playground',
    },
    {
        label: 'Docs',
        href: 'https://docs.longlink.dev',
    },
];

/** Renders the public landing page footer. */
export function Footer() {
    return (
        <footer className="pt-20 md:pt-32">
            <div>
                <div className="flex w-full flex-col items-center justify-between gap-10 px-6 text-center lg:flex-row lg:items-start lg:text-left">
                    <div className="flex w-full flex-col items-center gap-4 lg:items-start lg:self-end">
                        <div className="flex items-end gap-6">
                            <Link
                                to="/"
                                className="inline-flex items-center leading-none lg:justify-start"
                                aria-label="LongLink home"
                            >
                                <img src="/favicon.ico" alt="LongLink logo" className="block size-8" />
                            </Link>

                            <ul className="text-muted-foreground flex items-end justify-center space-x-4">
                                {socialLinks.map(({ href, label, icon: Icon }) => (
                                    <li key={label}>
                                        <a
                                            href={href}
                                            aria-label={label}
                                            title={label}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-accent inline-flex transition-colors"
                                        >
                                            <Icon className="h-4 w-4" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="grid w-full gap-3 self-end lg:items-end lg:text-right">
                        <div>
                            <h3 className="mb-2 font-bold">Navigation</h3>
                            <ul className="text-muted-foreground flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-center sm:gap-4 lg:justify-end">
                                {navigationLinks.map(({ label, href }) => (
                                    <li key={label} className="font-medium transition-colors hover:text-accent">
                                        {href.startsWith('http') ? (
                                            <a href={href} target="_blank" rel="noopener noreferrer">
                                                {label}
                                            </a>
                                        ) : (
                                            <Link to={href}>{label}</Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-3 w-full px-6">
                    <div className="text-muted-foreground flex w-full flex-col items-center gap-3 border-t py-3 text-center text-xs font-medium md:flex-row md:justify-between md:text-left">
                        <p>LongLink SAGL - All Rights Reserved</p>
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
            </div>
        </footer>
    );
}

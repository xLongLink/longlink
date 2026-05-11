import { Linkedin, MessageCircle, MessageSquareMore, X } from 'lucide-react';
import { Link } from 'react-router';

const socialLinks = [
    {
        href: 'https://www.linkedin.com/company/swissgpu',
        label: 'LinkedIn',
        icon: Linkedin,
    },
    {
        href: 'https://www.reddit.com/r/swissgpu/',
        label: 'Reddit',
        icon: MessageCircle,
    },
    {
        href: 'https://discord.gg/ddMcztB3',
        label: 'Discord',
        icon: MessageSquareMore,
    },
    {
        href: 'https://x.com',
        label: 'X',
        icon: X,
    },
];

const navigationLinks = [
    {
        label: 'Home',
        href: '/',
    },
    {
        label: 'Features',
        href: '/features',
    },
    {
        label: 'Pricing',
        href: '/pricing',
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
                <div className="flex w-full flex-col items-center justify-between gap-10 px-4 text-center sm:px-6 lg:flex-row lg:items-start lg:px-8 lg:text-left">
                    <div className="flex w-full flex-col items-center justify-between gap-6 lg:items-start">
                        <Link to="/" className="flex items-center gap-2 lg:justify-start" aria-label="LongLink home">
                            <img src="/favicon.ico" alt="LongLink logo" className="size-8 rounded-md p-0.5" />
                            LongLink
                        </Link>

                        <ul className="text-muted-foreground flex items-center justify-center space-x-6">
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
                                        <Icon className="h-5 w-5" />
                                    </a>
                                </li>
                            ))}
                        </ul>
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

                <div className="mt-5 w-full px-4 sm:px-6 lg:px-8">
                    <div className="text-muted-foreground flex w-full flex-col items-center gap-3 border-t py-5 text-center text-xs font-medium md:flex-row md:justify-between md:text-left">
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

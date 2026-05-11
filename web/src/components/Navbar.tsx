import { Link } from 'react-router';

import { Button } from '@ui/button';

/** Renders the public landing page navigation. */
export function Navbar() {
    return (
        <header className="py-4">
            <div>
                <nav
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8"
                    aria-label="Main navigation"
                >
                    <Link to="/" className="flex items-center gap-2" aria-label="LongLink home">
                        <img src="/favicon.ico" alt="LongLink logo" className="size-8 rounded-md p-0.5" />
                        LongLink
                    </Link>

                    <ul className="hidden items-center justify-center gap-8 md:flex">
                        <li className="font-medium transition-colors hover:text-accent">
                            <Link
                                to="/features"
                                className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Features
                            </Link>
                        </li>
                        <li className="font-medium transition-colors hover:text-accent">
                            <Link
                                to="/pricing"
                                className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Pricing
                            </Link>
                        </li>
                        <li className="font-medium transition-colors hover:text-accent">
                            <a
                                href="https://docs.longlink.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Docs
                            </a>
                        </li>
                    </ul>

                    <Button asChild className="ml-auto w-24">
                        <Link to="/login">Login</Link>
                    </Button>
                </nav>
            </div>
        </header>
    );
}

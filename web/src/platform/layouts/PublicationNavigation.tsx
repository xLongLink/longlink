import { Link } from 'react-router';
import { Collapsible } from '@base-ui/react/collapsible';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import './publication-navigation.css';

type PublicationPage = { path: string; label: string; icon: LucideIcon; children?: readonly PublicationPage[] };

/** Adds optional arrow shortcuts without changing native link activation or Tab order. */
function moveNavigationFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const direction = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];

    if (!direction && event.key !== 'Home' && event.key !== 'End') return;

    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button')).filter(
        (control) => !control.closest('[hidden], [inert]')
    );

    const target = event.target;

    if (!(target instanceof HTMLElement)) return;
    const index = controls.indexOf(target);

    if (index < 0) return;

    const next =
        event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? controls.length - 1
              : (index + (direction ?? 0) + controls.length) % controls.length;

    event.preventDefault();
    controls[next]?.focus();
}

/** Renders route navigation rather than tabs with nonexistent tab panels. */
export function PublicationSectionLinks({
    groups,
    activePath
}: {
    groups: readonly { path: string; label: string }[];
    activePath: string;
}) {
    return (
        <nav aria-label="Documentation sections" className="publication-section-links" onKeyDown={moveNavigationFocus}>
            {groups.map((group) => (
                <Link
                    key={group.path}
                    to={`${group.path}/`}
                    aria-current={activePath === group.path ? 'page' : undefined}
                >
                    {group.label}
                </Link>
            ))}
        </nav>
    );
}

/** Shares the publication sidebar's density and disclosure behavior across legal and docs. */
export function PublicationNavigation({ label, children }: { label: string; children: ReactNode }) {
    return (
        <nav aria-label={label} className="publication-navigation" onKeyDown={moveNavigationFocus}>
            {children}
        </nav>
    );
}

/** Labels one group of publication links. */
export function PublicationNavigationSection({ title, children }: { title: string; children: ReactNode }) {
    const headingId = useId();

    return (
        <section className="publication-navigation-section" aria-labelledby={headingId}>
            <h2 id={headingId}>{title}</h2>
            <section className="publication-navigation-items">{children}</section>
        </section>
    );
}

/** Keeps nested disclosure state mounted while router links change the article. */
export function PublicationNavigationItem({
    page,
    pagePath,
    hash = '',
    trailingSlash = true
}: {
    page: PublicationPage;
    pagePath: string;
    hash?: string;
    trailingSlash?: boolean;
}) {
    const selected = `${pagePath}${hash}` === page.path;

    if (page.children?.length) {
        return (
            <Collapsible.Root defaultOpen={false}>
                <Collapsible.Trigger
                    className="publication-navigation-row"
                    aria-current={selected ? 'location' : undefined}
                >
                    <span>{page.label}</span>
                    <ChevronDown aria-hidden size={20} className="publication-navigation-chevron" />
                </Collapsible.Trigger>
                <Collapsible.Panel keepMounted className="publication-navigation-children">
                    {page.children.map((child) => (
                        <PublicationNavigationItem key={child.path} page={child} pagePath={pagePath} />
                    ))}
                </Collapsible.Panel>
            </Collapsible.Root>
        );
    }

    const [pathname, fragment] = page.path.split('#');
    const to = `${pathname}${trailingSlash ? '/' : ''}${fragment ? `#${fragment}` : ''}`;

    return (
        <Link
            className="publication-navigation-row"
            to={to}
            aria-current={selected ? (fragment ? 'location' : 'page') : undefined}
        >
            <page.icon aria-hidden size={16} />
            <span>{page.label}</span>
        </Link>
    );
}

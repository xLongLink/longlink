import { Link } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { useId, type KeyboardEvent, type ReactNode } from 'react';

type PublicationPage = { path: string; label: string; icon: LucideIcon };

const rowClassName =
    'publication-navigation-row flex box-border w-full min-h-8 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-2 py-0 font-[inherit] text-sm leading-(--text-sm--line-height) font-normal text-start text-foreground no-underline hover:bg-muted aria-[current]:bg-muted aria-[current]:font-medium focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:-outline-offset-2 forced-colors:aria-[current]:bg-[Highlight] forced-colors:aria-[current]:text-[HighlightText] [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>svg]:flex-none [&>svg]:text-muted-foreground aria-[current]:[&>svg]:text-inherit';

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
    activePath,
    label = 'Documentation sections'
}: {
    groups: readonly { path: string; label: string }[];
    activePath: string;
    label?: string;
}) {
    return (
        <nav
            aria-label={label}
            className="flex min-w-0 max-w-full gap-0.5 overflow-x-auto"
            onKeyDown={moveNavigationFocus}
        >
            {groups.map((group) => (
                <Link
                    key={group.path}
                    className="relative flex min-h-8 flex-none items-center rounded-lg px-3 text-sm leading-(--text-sm--line-height) font-normal whitespace-nowrap text-muted-foreground no-underline hover:bg-muted aria-[current]:font-semibold aria-[current]:text-foreground aria-[current]:after:absolute aria-[current]:after:inset-x-3 aria-[current]:after:bottom-0 aria-[current]:after:h-0.5 aria-[current]:after:rounded-full aria-[current]:after:bg-primary aria-[current]:after:content-[''] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:-outline-offset-2"
                    to={`${group.path}/`}
                    aria-current={activePath === group.path ? 'page' : undefined}
                >
                    {group.label}
                </Link>
            ))}
        </nav>
    );
}

/** Shares the publication sidebar's density and keyboard navigation across legal and docs. */
export function PublicationNavigation({ label, children }: { label: string; children: ReactNode }) {
    return (
        <nav aria-label={label} className="box-border w-full px-6 py-8 lg:w-[260px]" onKeyDown={moveNavigationFocus}>
            {children}
        </nav>
    );
}

/** Labels one group of publication links. */
export function PublicationNavigationSection({ title, children }: { title: string; children: ReactNode }) {
    const headingId = useId();

    return (
        <section className="flex flex-col py-1" aria-labelledby={headingId}>
            <h2
                className="m-0 px-2 py-1 text-sm leading-(--text-sm--line-height) font-semibold text-muted-foreground"
                id={headingId}
            >
                {title}
            </h2>
            <section className="flex flex-col gap-0.5">{children}</section>
        </section>
    );
}

/** Links to an article or fragment within a publication section. */
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

    const [pathname, fragment] = page.path.split('#');
    const to = `${pathname}${trailingSlash ? '/' : ''}${fragment ? `#${fragment}` : ''}`;

    return (
        <Link className={rowClassName} to={to} aria-current={selected ? (fragment ? 'location' : 'page') : undefined}>
            <page.icon aria-hidden size={16} />
            <span>{page.label}</span>
        </Link>
    );
}

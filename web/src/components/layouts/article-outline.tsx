import { useLocation } from 'react-router';
import { Scrollspy } from '@/components/reui/scrollspy';

export type ArticleOutlineItem = { id: string; label: string; level: number };

/** Tracks the authored article headings in the page's viewport scroll root. */
export function ArticleOutline({ items }: { items: readonly ArticleOutlineItem[] }) {
    const { hash, pathname } = useLocation();

    // Delegate section tracking and fragment navigation to the shared primitive.
    return (
        <aside
            className="sticky top-20 box-border hidden w-56 flex-none flex-col gap-3 self-start p-5 min-[64rem]:flex"
            aria-label="On this page"
        >
            <h2 className="m-0 font-sans text-sm leading-(--text-sm--line-height) font-semibold text-foreground">
                On this page
            </h2>
            <nav aria-label="On this page">
                <Scrollspy key={pathname} initialHash={hash} history="push">
                    <ul className="m-0 flex list-none flex-col gap-0.5 border-s-2 border-border p-0">
                        {items.map((item, index) => (
                            <li
                                key={item.id}
                                className="m-0 p-0 has-[[aria-current=location]]:shadow-[-2px_0_var(--foreground)]"
                            >
                                <a
                                    className="relative block truncate rounded-lg py-1 ps-3 pe-2 text-sm leading-(--text-sm--line-height) font-normal text-muted-foreground no-underline data-[level=3]:ps-7 data-[level=4]:ps-11 data-[level=5]:ps-12 data-[level=6]:ps-12 aria-[current=location]:font-semibold aria-[current=location]:text-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2"
                                    href={`#${encodeURIComponent(item.id)}`}
                                    data-level={item.level}
                                    data-scrollspy-anchor={item.id}
                                    aria-current={index === 0 ? 'location' : undefined}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </Scrollspy>
            </nav>
        </aside>
    );
}

/** Prevents indexing without publishing canonical or social metadata for a private page. */
export function NoIndex({ title }: { title: string }) {
    return (
        <>
            <title>{title}</title>
            <meta name="robots" content="noindex, nofollow" />
        </>
    );
}

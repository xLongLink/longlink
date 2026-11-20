import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/shadcn/button';
import { apiQueryOptions } from '@/lib/react-query';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Avatar } from '@/components/longlink/display/avatar';
import { Pagination } from '@/components/longlink/action/pagination';
import { zPagePublicSolution } from '@/lib/generated/platform-api-v1/zod.gen';

const pageSize = 25;

/** Lists public Solutions with their live display metadata. */
export default function ExploreSolutions() {
    const [page, setPage] = useState(1);
    const path = `/api/v1/public/solutions?page=${page}&page_size=${pageSize}`;
    const { data, isPending, isError, refetch } = useQuery(apiQueryOptions(path, zPagePublicSolution));
    const solutions = isError ? [] : (data?.items ?? []);
    const total = data?.total ?? 0;

    return (
        <section
            className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-4 p-6"
            aria-label="Public solutions"
            aria-busy={isPending}
        >
            {isPending ? (
                <div className="flex min-w-0 flex-col gap-4" role="status" aria-label="Loading solutions">
                    {[0, 1, 2].map((index) => (
                        <div
                            key={index}
                            className="flex min-w-0 flex-col gap-4 overflow-clip border border-border bg-card p-6"
                        >
                            <div className="flex min-w-0 items-start justify-between gap-4">
                                <div className="flex w-2/3 min-w-0 flex-col gap-2">
                                    <Skeleton className="h-7 w-full" />
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="size-6 shrink-0 rounded-lg" />
                                        <Skeleton className="h-5 w-1/2" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-12" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : isError ? (
                <div className="min-w-0 overflow-clip border border-border bg-transparent p-4">
                    <Empty role="status" title="Unable to load solutions">
                        <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                            Retry
                        </Button>
                    </Empty>
                </div>
            ) : solutions.length === 0 ? (
                <div className="min-w-0 overflow-clip border border-border bg-transparent p-4">
                    <Empty role="status" title="No public solutions">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                if (page > 1) {
                                    setPage(1);

                                    return;
                                }

                                void refetch();
                            }}
                        >
                            {page > 1 ? 'First page' : 'Refresh'}
                        </Button>
                    </Empty>
                </div>
            ) : (
                <>
                    <ul className="flex min-w-0 flex-col gap-4">
                        {solutions.map((solution) => (
                            <li key={solution.id} className="min-w-0">
                                <Link
                                    to={`/explore/solutions/${solution.id}`}
                                    className="group flex min-w-0 flex-col gap-4 border border-border bg-card p-6 text-foreground hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                    <div className="flex min-w-0 items-start justify-between gap-4">
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <h2 className="text-xl leading-snug font-semibold tracking-tight [overflow-wrap:anywhere] group-hover:underline group-focus-visible:underline">
                                                {solution.name}
                                            </h2>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <Avatar
                                                    shape="rounded"
                                                    size="sm"
                                                    name={solution.organization.name}
                                                    aria-hidden
                                                />
                                                <p className="min-w-0 text-sm leading-normal text-muted-foreground [overflow-wrap:anywhere]">
                                                    {solution.organization.name}
                                                </p>
                                            </div>
                                        </div>
                                        {solution.deployed_version && (
                                            <Badge
                                                variant="outline"
                                                render={<span className="h-auto max-w-1/3 min-h-5" />}
                                            >
                                                <span className="min-w-0 text-muted-foreground tabular-nums whitespace-normal [overflow-wrap:anywhere]">
                                                    v{solution.deployed_version.replace(/^v/, '')}
                                                </span>
                                            </Badge>
                                        )}
                                    </div>
                                    {solution.description && (
                                        <p className="text-sm leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
                                            {solution.description}
                                        </p>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    {total > pageSize && (
                        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
                    )}
                </>
            )}
        </section>
    );
}

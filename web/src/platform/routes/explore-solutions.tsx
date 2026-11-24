import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/shadcn/button';
import { apiQueryOptions } from '@/lib/react-query';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Avatar } from '@/components/longlink/display/avatar';
import { Pagination } from '@/components/longlink/action/pagination';
import { zPagePublicSolution } from '@/lib/generated/platform-api-v1/zod.gen';

const pageSize = 25;

/** Lists public Solutions with their live display metadata. */
export default function ExploreSolutions() {
    const [page, setPage] = useState(1);
    const [failedBanners, setFailedBanners] = useState<string[]>([]);
    const path = `/api/v1/public/solutions?page=${page}&page_size=${pageSize}`;
    const { data, isPending, isError, refetch } = useQuery(apiQueryOptions(path, zPagePublicSolution));
    const solutions = isError ? [] : (data?.items ?? []);
    const total = data?.total ?? 0;

    return (
        <Stack
            as="section"
            gap={4}
            padding={6}
            className="mx-auto w-full min-w-0 max-w-[800px]"
            aria-label="Public solutions"
            aria-busy={isPending}
        >
            {isPending ? (
                <Stack gap={4} className="min-w-0" role="status" aria-label="Loading solutions">
                    {[0, 1, 2].map((index) => (
                        <Stack
                            key={index}
                            gap={4}
                            padding={6}
                            className="min-w-0 overflow-clip border border-border bg-card"
                        >
                            <Stack direction="horizontal" align="start" justify="between" gap={4} className="min-w-0">
                                <Stack gap={2} className="w-2/3 min-w-0">
                                    <Skeleton className="h-7 w-full" />
                                    <Stack direction="horizontal" align="center" gap={2}>
                                        <Skeleton className="size-6 shrink-0 rounded-lg" />
                                        <Skeleton className="h-5 w-1/2" />
                                    </Stack>
                                </Stack>
                                <Skeleton className="h-4 w-12" />
                            </Stack>
                            <Stack gap={2}>
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-3/4" />
                            </Stack>
                        </Stack>
                    ))}
                </Stack>
            ) : isError ? (
                <div className="min-w-0 overflow-clip border border-border bg-transparent p-4" role="status">
                    <Empty title="Unable to load solutions">
                        <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                            Retry
                        </Button>
                    </Empty>
                </div>
            ) : solutions.length === 0 ? (
                <div className="min-w-0 overflow-clip border border-border bg-transparent p-4" role="status">
                    <Empty title="No public solutions">
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
                        {solutions.map((solution) => {
                            const { banner } = solution;

                            return (
                                <li key={solution.id} className="min-w-0">
                                    <Link
                                        to={`/orgs/${solution.organization.id}/solutions/${solution.id}`}
                                        className="group flex min-w-0 flex-col overflow-hidden border border-border bg-card text-foreground hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    >
                                        {banner && !failedBanners.includes(banner) && (
                                            <img
                                                src={banner}
                                                alt=""
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                className="max-h-64 w-full object-contain"
                                                onError={() => {
                                                    setFailedBanners((banners) => [...banners, banner]);
                                                }}
                                            />
                                        )}
                                        <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
                                            <Stack
                                                direction="horizontal"
                                                align="start"
                                                justify="between"
                                                gap={4}
                                                className="min-w-0"
                                            >
                                                <Stack gap={1} className="min-w-0 flex-1">
                                                    <h2 className="text-xl leading-snug font-semibold tracking-tight [overflow-wrap:anywhere] group-hover:underline group-focus-visible:underline">
                                                        {solution.name}
                                                    </h2>
                                                    <Stack
                                                        direction="horizontal"
                                                        align="center"
                                                        gap={2}
                                                        className="min-w-0"
                                                    >
                                                        <Avatar
                                                            shape="rounded"
                                                            size="sm"
                                                            name={solution.organization.name}
                                                            aria-hidden
                                                        />
                                                        <p className="min-w-0 text-sm leading-normal text-muted-foreground [overflow-wrap:anywhere]">
                                                            {solution.organization.name}
                                                        </p>
                                                    </Stack>
                                                </Stack>
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
                                            </Stack>
                                            {solution.description && (
                                                <p className="text-sm leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
                                                    {solution.description}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    {total > pageSize && (
                        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
                    )}
                </>
            )}
        </Stack>
    );
}

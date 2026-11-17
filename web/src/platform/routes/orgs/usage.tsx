import { ExternalLink } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Progress } from '@/components/longlink/display/progress';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeNavigationLink } from '@/components/custom/native-link';
import { Card, CardHeader, CardContent } from '@/components/shadcn/card';
import { Button, buttonVariants } from '@/components/longlink/action/button';

/** Shows the Organization's usage against free allowances or card-enabled capacity. */
export default function Usage({ base }: { base: string }) {
    // Share authoritative membership counts, card registration, and rates without querying Stripe.
    const [usage] = useApi(`${base}/usage`, schemas.zOrganizationUsage);
    const userScale = usage.has_payment_method ? Math.max(100, usage.users) : usage.free_users;

    // Retain the existing settings shell and its spacing.
    return (
        <Stack gap={4}>
            <Stack gap={0} justify="end" className="min-h-8">
                <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                    Usage
                </h2>
            </Stack>
            <Separator />
            <Card>
                <CardHeader className="flex items-center justify-between border-b">
                    <Stack gap={0}>
                        <h4 className="font-semibold tracking-tight text-xl" aria-level={3}>
                            Monthly usage
                        </h4>
                        <span className="text-muted-foreground">
                            {usage.has_payment_method ? 'Provisioned capacity' : 'Free tier limits'}
                        </span>
                    </Stack>
                    <NativeNavigationLink
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        href="/pricing/"
                        target="_blank"
                    >
                        See prices
                        <ExternalLink className="size-4" aria-hidden="true" />
                    </NativeNavigationLink>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Progress
                        value={usage.solutions}
                        max={usage.max_solutions}
                        label="Solutions"
                        showValue
                        valueText={`${usage.solutions} / ${usage.max_solutions}`}
                    />
                    <Progress
                        value={usage.users}
                        max={userScale}
                        label="Users"
                        showValue
                        valueText={`${usage.users} / ${userScale}`}
                    />
                    {(['storage', 'database'] as const).map((resource) => (
                        <ApiBoundary
                            key={resource}
                            fallback={<span className="text-muted-foreground">Loading {resource} usage…</span>}
                            fallbackRender={({ resetErrorBoundary }) => (
                                <Stack direction="horizontal" align="center" justify="between" gap={4}>
                                    <span className="text-muted-foreground">
                                        {resource === 'storage' ? 'File storage' : 'Database storage'} usage
                                        unavailable.
                                    </span>
                                    <Button onClick={resetErrorBoundary}>Retry</Button>
                                </Stack>
                            )}
                        >
                            <UsageMeter
                                base={base}
                                resource={resource}
                                included={resource === 'storage' ? usage.free_storage_bytes : usage.free_database_bytes}
                                hasPaymentMethod={usage.has_payment_method}
                            />
                        </ApiBoundary>
                    ))}
                </CardContent>
            </Card>
        </Stack>
    );
}

/** Shows measured storage against the free allowance or its actual provisioned quota. */
function UsageMeter({
    base,
    resource,
    included,
    hasPaymentMethod
}: {
    base: string;
    resource: 'storage' | 'database';
    included: number;
    hasPaymentMethod: boolean;
}) {
    const [usage] = useApi(`${base}/${resource}`, schemas.zOrganizationByteUsage);

    // Registered Organizations use their actual provisioned capacity.
    const capacity = hasPaymentMethod ? usage.quota_bytes : included;

    return (
        <Progress
            value={usage.space_used}
            max={capacity}
            label={resource === 'storage' ? 'File storage' : 'Database storage'}
            showValue
            valueText={`${formatStorage(usage.space_used)} / ${formatStorage(capacity)}`}
        />
    );
}

/** Formats included and measured usage using the same binary units. */
function formatStorage(bytes: number) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const unit = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

    return `${(bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[unit]}`;
}

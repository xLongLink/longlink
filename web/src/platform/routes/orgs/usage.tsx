import { ExternalLink } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { Separator } from '@/components/shadcn/separator';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Card, CardHeader, CardContent } from '@/components/shadcn/card';
import { NativeButton as Button } from '@/components/custom/native-button';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { Progress, ProgressLabel, ProgressValue } from '@/components/shadcn/progress';

/** Shows the Organization's usage against free allowances or card-enabled capacity. */
export default function Usage({ base }: { base: string }) {
    // Share authoritative membership counts, card registration, and rates without querying Stripe.
    const [usage] = useApi(`${base}/usage`, schemas.zOrganizationUsage);
    const userScale = usage.has_payment_method ? Math.max(100, usage.users) : usage.free_users;

    // Retain the existing settings shell and its spacing.
    return (
        <Stack gap={4}>
            <Stack justify="end" minHeight="calc(var(--spacing)*8)">
                <Heading level={2} className="block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                    Usage
                </Heading>
            </Stack>
            <Separator />
            <Card>
                <CardHeader className="flex items-center justify-between border-b">
                    <Stack gap={0}>
                        <Heading level={4} accessibilityLevel={3}>
                            Monthly usage
                        </Heading>
                        <Text className="text-muted-foreground">
                            {usage.has_payment_method ? 'Provisioned capacity' : 'Free tier limits'}
                        </Text>
                    </Stack>
                    <Button
                        label="See prices"
                        size="sm"
                        href="/pricing/"
                        target="_blank"
                        rel="noopener noreferrer"
                        endContent={<ExternalLink className="size-4" aria-hidden="true" />}
                    />
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Progress value={usage.solutions} max={usage.max_solutions}>
                        <ProgressLabel>Solutions</ProgressLabel>
                        <ProgressValue>{() => `${usage.solutions} / ${usage.max_solutions}`}</ProgressValue>
                    </Progress>
                    <Progress value={usage.users} max={userScale}>
                        <ProgressLabel>Users</ProgressLabel>
                        <ProgressValue>{() => `${usage.users} / ${userScale}`}</ProgressValue>
                    </Progress>
                    {(['storage', 'database'] as const).map((resource) => (
                        <ApiBoundary
                            key={resource}
                            fallback={<Text className="text-muted-foreground">Loading {resource} usage…</Text>}
                            fallbackRender={({ resetErrorBoundary }) => (
                                <Stack direction="horizontal" align="center" justify="between" gap={4}>
                                    <Text className="text-muted-foreground">
                                        {resource === 'storage' ? 'File storage' : 'Database storage'} usage
                                        unavailable.
                                    </Text>
                                    <Button label="Retry" onClick={resetErrorBoundary} />
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
        <Progress value={usage.space_used} max={capacity}>
            <ProgressLabel>{resource === 'storage' ? 'File storage' : 'Database storage'}</ProgressLabel>
            <ProgressValue>{() => `${formatStorage(usage.space_used)} / ${formatStorage(capacity)}`}</ProgressValue>
        </Progress>
    );
}

/** Formats included and measured usage using the same binary units. */
function formatStorage(bytes: number) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const unit = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

    return `${(bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[unit]}`;
}

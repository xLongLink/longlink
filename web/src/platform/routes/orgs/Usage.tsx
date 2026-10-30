import { ExternalLink } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

/** Shows the Organization's usage against free allowances or card-enabled capacity. */
export default function Usage({ base }: { base: string }) {
    // Share authoritative membership counts, card registration, and rates without querying Stripe.
    const [usage] = useApi(`${base}/usage`, schemas.zOrganizationUsage);
    const userScale = usage.has_payment_method ? Math.max(100, usage.users) : usage.free_users;

    // Retain the existing settings shell and its spacing.
    return (
        <Stack gap={4}>
            <Stack justify="end" minHeight="var(--size-element-md)">
                <Heading level={2} hasCapsize>
                    Usage
                </Heading>
            </Stack>
            <Divider />
            <Card padding={0} className="overflow-hidden">
                <Stack gap={0}>
                    <Stack
                        direction="horizontal"
                        align="center"
                        justify="between"
                        gap={4}
                        paddingInline={4}
                        paddingBlock={2}
                        className="bg-muted"
                    >
                        <Stack gap={0}>
                            <Heading level={4} accessibilityLevel={3}>
                                Monthly usage
                            </Heading>
                            <Text color="secondary">
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
                    </Stack>
                    <Divider />
                    <Stack gap={4} padding={4}>
                        <ProgressBar
                            label="Solutions"
                            value={usage.solutions}
                            max={usage.max_solutions}
                            hasValueLabel
                            formatValueLabel={() => `${usage.solutions} / ${usage.max_solutions}`}
                        />
                        <ProgressBar
                            label="Users"
                            value={usage.users}
                            max={userScale}
                            hasValueLabel
                            formatValueLabel={() => `${usage.users} / ${userScale}`}
                        />
                        {(['storage', 'database'] as const).map((resource) => (
                            <ApiBoundary
                                key={resource}
                                fallback={<Text color="secondary">Loading {resource} usage…</Text>}
                                fallbackRender={({ resetErrorBoundary }) => (
                                    <Stack direction="horizontal" align="center" justify="between" gap={4}>
                                        <Text color="secondary">
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
                                    included={
                                        resource === 'storage' ? usage.free_storage_bytes : usage.free_database_bytes
                                    }
                                    hasPaymentMethod={usage.has_payment_method}
                                />
                            </ApiBoundary>
                        ))}
                    </Stack>
                </Stack>
            </Card>
        </Stack>
    );
}

/** Shows measured storage against the free allowance or its actual provisioned quota. */
function UsageMeter({
    base,
    resource,
    included,
    hasPaymentMethod,
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
        <ProgressBar
            label={resource === 'storage' ? 'File storage' : 'Database storage'}
            value={usage.space_used}
            max={capacity}
            hasValueLabel
            formatValueLabel={() => `${formatStorage(usage.space_used)} / ${formatStorage(capacity)}`}
        />
    );
}

/** Formats included and measured usage using the same binary units. */
function formatStorage(bytes: number) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const unit = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

    return `${(bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[unit]}`;
}

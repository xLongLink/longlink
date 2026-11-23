import { api } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { ReportedError } from '@/lib/reported';
import { Text } from '@/components/longlink/display/text';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Heading } from '@/components/longlink/display/heading';
import { useConfirmAction } from '@/lib/hooks/use-confirm-action';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Table, TableBody, TableRow, TableCell } from '@/components/longlink/display/table';

/** Owns card registration and saved-card reads only while Payment Methods is active. */
export default function PaymentMethods({ base, canManage }: { base: string; canManage: boolean }) {
    const [usage] = useApi(`${base}/usage`, schemas.zOrganizationUsage);

    const reportError = useApiError();
    const { isPending: pending, run } = useConfirmAction();

    /** Opens owner-authorized Stripe card registration without an immediate payment. */
    function registerCard() {
        run(async () => {
            try {
                const response = await api.post(`${base}/cards/checkout`).json(schemas.zPaymentRedirect);

                // Redirect only after validating the API's hosted URL.
                window.location.assign(response.url);
            } catch (cause) {
                if (!(cause instanceof ReportedError)) reportError(cause);
            }
        });
    }

    return (
        <Stack gap={0}>
            <Stack gap={4}>
                <Stack gap={0} direction="horizontal" justify="between" align="end" wrap="wrap" className="min-h-8">
                    <Heading level={2} trim>
                        Payment Methods
                    </Heading>
                    {usage.stripe_enabled && canManage && (
                        <Button size="sm" disabled={pending} aria-busy={pending || undefined} onClick={registerCard}>
                            Add card
                        </Button>
                    )}
                    <span role="status" className="sr-only">
                        {pending ? 'Loading' : ''}
                    </span>
                </Stack>
                <Separator />
            </Stack>
            {!usage.stripe_enabled ? (
                <Text as="p" tone="muted">
                    Card registration is not enabled on this deployment.
                </Text>
            ) : canManage ? (
                <ApiBoundary fallback={<Text tone="muted">Loading registered cards…</Text>}>
                    <RegisteredCards base={base} />
                </ApiBoundary>
            ) : (
                <Text as="p" tone="muted">
                    An organization owner can view and register cards.
                </Text>
            )}
        </Stack>
    );
}

/** Shows masked Stripe card details without storing payment metadata in LongLink. */
function RegisteredCards({ base }: { base: string }) {
    const [cards] = useApi(`${base}/cards`, schemas.zPaymentCard.array());

    return (
        <Table wrap>
            <TableBody>
                {cards.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell>
                            <span className="capitalize">
                                {row.brand.replaceAll('_', ' ')} •••• {row.last4}
                            </span>
                        </TableCell>
                        <TableCell>{`${String(row.exp_month).padStart(2, '0')}/${row.exp_year}`}</TableCell>
                        <TableCell>{row.is_default ? <Badge variant="secondary">Default</Badge> : null}</TableCell>
                    </TableRow>
                ))}
                {cards.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} align="center">
                            <Empty title="No data" />
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

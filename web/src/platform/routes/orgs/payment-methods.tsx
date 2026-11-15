import { api } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useApi } from '@/lib/hooks/use-api';
import { useRef, useTransition } from 'react';
import { ApiBoundary } from '@/components/api';
import { Token } from '@/components/custom/token';
import { Separator } from '@/components/shadcn/separator';
import { Button } from '@/components/longlink/action/button';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/shadcn/table';

/** Owns card registration and saved-card reads only while Payment Methods is active. */
export default function PaymentMethods({ base, canManage }: { base: string; canManage: boolean }) {
    const [usage] = useApi(`${base}/usage`, schemas.zOrganizationUsage);
    const reportError = useApiError();
    const inFlight = useRef(false);
    const [pending, startRegistration] = useTransition();

    /** Opens owner-authorized Stripe card registration without an immediate payment. */
    async function registerCard() {
        // Guard checkout creation before pending state renders.
        if (inFlight.current) return;
        inFlight.current = true;

        try {
            const response = await api.post(`${base}/cards/checkout`).json(schemas.zPaymentRedirect);

            // Redirect only after validating the API's hosted URL.
            window.location.assign(response.url);
        } catch (cause) {
            reportError(cause);
        } finally {
            inFlight.current = false;
        }
    }

    return (
        <Stack gap={4}>
            <Stack direction="horizontal" justify="between" align="end" wrap="wrap" minHeight="calc(var(--spacing)*8)">
                <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                    Payment Methods
                </h2>
                {usage.stripe_enabled && canManage && (
                    <Button
                        size="sm"
                        disabled={pending}
                        aria-busy={pending || undefined}
                        onClick={() => startRegistration(registerCard)}
                    >
                        Add card
                    </Button>
                )}
                <span role="status" className="sr-only">
                    {pending ? 'Loading' : ''}
                </span>
            </Stack>
            <Separator />
            {!usage.stripe_enabled ? (
                <p className="text-muted-foreground">Card registration is not enabled on this deployment.</p>
            ) : canManage ? (
                <ApiBoundary fallback={<span className="text-muted-foreground">Loading registered cards…</span>}>
                    <RegisteredCards base={base} />
                </ApiBoundary>
            ) : (
                <p className="text-muted-foreground">An organization owner can view and register cards.</p>
            )}
        </Stack>
    );
}

/** Shows masked Stripe card details without storing payment metadata in LongLink. */
function RegisteredCards({ base }: { base: string }) {
    const [cards] = useApi(`${base}/cards`, schemas.zPaymentCard.array());

    return (
        <Table className="[&_td]:whitespace-normal">
            <TableHeader>
                <TableRow>
                    <TableHead>Card</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {cards.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell>
                            <span className="capitalize">
                                {row.brand.replaceAll('_', ' ')} •••• {row.last4}
                            </span>
                        </TableCell>
                        <TableCell>{`${String(row.exp_month).padStart(2, '0')}/${row.exp_year}`}</TableCell>
                        <TableCell>{row.is_default ? <Token label="Default" /> : null}</TableCell>
                    </TableRow>
                ))}
                {cards.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center">
                            <Empty role="status" title="No data" />
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
import { Empty } from '@/components/longlink/empty';

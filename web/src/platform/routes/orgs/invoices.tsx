import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { Link } from '@/components/longlink/action/link';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Currency } from '@/components/longlink/display/currency';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Timestamp } from '@/components/longlink/display/timestamp';
import { Table, TableBody, TableRow, TableCell } from '@/components/longlink/display/table';

/** Keeps private invoice reads scoped to the active owner-only settings section. */
export default function Invoices({ base, canManage }: { base: string; canManage: boolean }) {
    return (
        <Stack gap={0}>
            <Stack gap={4}>
                <Stack gap={0} justify="end" className="min-h-8">
                    <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                        Invoices
                    </h2>
                </Stack>
                <Separator />
            </Stack>
            {canManage ? (
                <ApiBoundary fallback={<span className="text-muted-foreground">Loading invoices…</span>}>
                    <InvoiceTable base={base} />
                </ApiBoundary>
            ) : (
                <p className="text-muted-foreground">An organization owner can view invoices.</p>
            )}
        </Stack>
    );
}

/** Reads issued invoices and links directly to their Stripe-hosted documents. */
function InvoiceTable({ base }: { base: string }) {
    const [invoices] = useApi(`${base}/invoices`, schemas.zPaymentInvoice.array());

    return (
        <Table wrap>
            <TableBody>
                {invoices.map((row) => {
                    const currency = row.currency.toUpperCase();
                    const fractionDigits =
                        new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions()
                            .maximumFractionDigits ?? 2;

                    return (
                        <TableRow key={row.id}>
                            <TableCell>
                                {row.hosted_invoice_url ? (
                                    <Link href={row.hosted_invoice_url} isExternalLink>
                                        {row.number ?? row.id}
                                    </Link>
                                ) : (
                                    <span>{row.number ?? row.id}</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Timestamp value={row.created_at} format="date" timeZone="UTC" />
                            </TableCell>
                            <TableCell align="end">
                                <Currency value={row.total / 10 ** fractionDigits} currency={currency} />
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">{row.status?.replaceAll('_', ' ') ?? 'Unknown'}</Badge>
                            </TableCell>
                            <TableCell>
                                {row.has_pdf ? (
                                    <Link href={`${base}/invoices/${row.id}/pdf`} isExternalLink>
                                        PDF
                                    </Link>
                                ) : null}
                            </TableCell>
                        </TableRow>
                    );
                })}
                {invoices.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} align="center">
                            <Empty title="No data" />
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

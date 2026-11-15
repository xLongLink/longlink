import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { Token } from '@/components/custom/token';
import { Separator } from '@/components/shadcn/separator';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/shadcn/table';

/** Keeps private invoice reads scoped to the active owner-only settings section. */
export default function Invoices({ base, canManage }: { base: string; canManage: boolean }) {
    return (
        <Stack gap={4}>
            <Stack justify="end" minHeight="calc(var(--spacing)*8)">
                <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                    Invoices
                </h2>
            </Stack>
            <Separator />
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
        <Table className="[&_td]:whitespace-normal">
            <TableHeader>
                <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-end">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Document</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.map((row) => {
                    const currency = new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: row.currency.toUpperCase()
                    });

                    return (
                        <TableRow key={row.id}>
                            <TableCell>
                                {row.hosted_invoice_url ? (
                                    <Link href={row.hosted_invoice_url} className="underline" isExternalLink>
                                        {row.number ?? row.id}
                                    </Link>
                                ) : (
                                    <span>{row.number ?? row.id}</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {new Date(row.created_at).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                            </TableCell>
                            <TableCell className="text-end">
                                {currency.format(
                                    row.total / 10 ** (currency.resolvedOptions().maximumFractionDigits ?? 2)
                                )}
                            </TableCell>
                            <TableCell>
                                <Token label={row.status?.replaceAll('_', ' ') ?? 'Unknown'} />
                            </TableCell>
                            <TableCell>
                                {row.has_pdf ? (
                                    <Link href={`${base}/invoices/${row.id}/pdf`} className="underline" isExternalLink>
                                        PDF
                                    </Link>
                                ) : null}
                            </TableCell>
                        </TableRow>
                    );
                })}
                {invoices.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center">
                            <Empty role="status" title="No data" />
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
import { Empty } from '@/components/longlink/empty';

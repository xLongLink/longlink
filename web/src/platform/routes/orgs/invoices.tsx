import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { Token } from '@/components/custom/token';
import { Separator } from '@/components/shadcn/separator';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DataTable, proportional } from '@/components/custom/data-table';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

/** Keeps private invoice reads scoped to the active owner-only settings section. */
export default function Invoices({ base, canManage }: { base: string; canManage: boolean }) {
    return (
        <Stack gap={4}>
            <Stack justify="end" minHeight="calc(var(--spacing)*8)">
                <Heading level={2} className="block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                    Invoices
                </Heading>
            </Stack>
            <Separator />
            {canManage ? (
                <ApiBoundary fallback={<Text className="text-muted-foreground">Loading invoices…</Text>}>
                    <InvoiceTable base={base} />
                </ApiBoundary>
            ) : (
                <Text as="p" className="text-muted-foreground">
                    An organization owner can view invoices.
                </Text>
            )}
        </Stack>
    );
}

/** Reads issued invoices and links directly to their Stripe-hosted documents. */
function InvoiceTable({ base }: { base: string }) {
    const [invoices] = useApi(`${base}/invoices`, schemas.zPaymentInvoice.array());

    return (
        <DataTable
            data={invoices}
            idKey="id"
            density="compact"
            columns={[
                {
                    key: 'number',
                    header: 'Invoice',
                    width: proportional(2),
                    renderCell: (invoice) =>
                        invoice.hosted_invoice_url ? (
                            <Link href={invoice.hosted_invoice_url} hasUnderline isExternalLink>
                                {invoice.number ?? invoice.id}
                            </Link>
                        ) : (
                            <Text>{invoice.number ?? invoice.id}</Text>
                        )
                },
                {
                    key: 'created_at',
                    header: 'Date',
                    width: proportional(1),
                    renderCell: (invoice) =>
                        new Date(invoice.created_at).toLocaleDateString(undefined, { timeZone: 'UTC' })
                },
                {
                    key: 'total',
                    header: 'Amount',
                    align: 'end',
                    width: proportional(1),
                    renderCell: (invoice) => {
                        const currency = new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: invoice.currency.toUpperCase()
                        });

                        return currency.format(
                            invoice.total / 10 ** (currency.resolvedOptions().maximumFractionDigits ?? 2)
                        );
                    }
                },
                {
                    key: 'status',
                    header: 'Status',
                    width: proportional(1),
                    renderCell: (invoice) => <Token label={invoice.status?.replaceAll('_', ' ') ?? 'Unknown'} />
                },
                {
                    key: 'has_pdf',
                    header: 'Document',
                    width: proportional(1),
                    renderCell: (invoice) =>
                        invoice.has_pdf ? (
                            <Link href={`${base}/invoices/${invoice.id}/pdf`} hasUnderline isExternalLink>
                                PDF
                            </Link>
                        ) : null
                }
            ]}
        />
    );
}

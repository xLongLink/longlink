import { useApi } from '@/lib/hooks/use-api';
import { Token } from '@/components/custom/Token';
import { Divider } from '@/components/custom/Divider';
import { ApiBoundary } from '@/components/ApiBoundary';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeLink as Link } from '@/components/custom/NativeLink';
import { NativeText as Text } from '@/components/custom/NativeText';
import { NativeStack as Stack } from '@/components/custom/NativeStack';
import { DataTable, proportional } from '@/components/custom/DataTable';
import { NativeHeading as Heading } from '@/components/custom/NativeHeading';

/** Keeps private invoice reads scoped to the active owner-only settings section. */
export default function Invoices({ base, canManage }: { base: string; canManage: boolean }) {
    return (
        <Stack gap={4}>
            <Stack justify="end" minHeight="var(--size-element-md)">
                <Heading level={2} hasCapsize>
                    Invoices
                </Heading>
            </Stack>
            <Divider />
            {canManage ? (
                <ApiBoundary fallback={<Text color="secondary">Loading invoices…</Text>}>
                    <InvoiceTable base={base} />
                </ApiBoundary>
            ) : (
                <Text as="p" color="secondary">
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

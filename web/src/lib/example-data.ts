import { type Component } from '@/types/viavai/form.types';
import { type TableSchemaConfig } from '@/types/viavai/table.types';

export const sampleFormSchema: Component[] = [
    {
        type: 'text',
        name: 'title',
        label: 'Bug Title',
        description: 'Short summary of the issue.',
        placeholder: 'Login button not working',
        required: true,
        default: '',
        validate: {
            minLength: 5,
            maxLength: 32,
        },
        error: 'Title must be between 5 and 32 characters.',
    },
    {
        type: 'textarea',
        name: 'description',
        label: 'Description',
        description: 'Steps to reproduce and expected result.',
        placeholder: 'Explain what happened...',
        required: true,
        default: '',
        validate: {
            minLength: 20,
            maxLength: 100,
        },
        error: 'Description must be between 20 and 100 characters.',
    },
];

type ExampleInvoice = {
    id: string;
    client: {
        name: string;
        email: string;
    };
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: string;
    subtotal: number;
    vat: number;
};

export const sampleTableSchema: TableSchemaConfig = {
    title: 'Invoices',
    description: 'Example viavai table rendered with schema and sample data.',
    schema: {
        columns: [
            {
                key: 'invoice',
                label: 'Invoice',
                align: 'left',
                cell: [
                    '{invoiceNumber}',
                    'Issued {issueDate}',
                    'Status: {status}',
                ],
            },
            {
                key: 'client',
                label: 'Client',
                cell: ['{client.name}', '{client.email}'],
            },
            {
                key: 'dueDate',
                label: 'Due Date',
                align: 'left',
                cell: ['{dueDate}'],
            },
            {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                cell: ['€{subtotal}', 'VAT €{vat}'],
            },
        ],
    },
};

export const sampleTableData: ExampleInvoice[] = [
    {
        id: '1',
        client: {
            name: 'Adriano Saurwein',
            email: 'adriano@email.com',
        },
        invoiceNumber: 'INV-001',
        issueDate: '2024-01-10',
        dueDate: '2024-01-20',
        status: 'Paid',
        subtotal: 1000,
        vat: 200,
    },
    {
        id: '2',
        client: {
            name: 'Leonardo Saurwein',
            email: 'leo@email.com',
        },
        invoiceNumber: 'INV-002',
        issueDate: '2024-01-15',
        dueDate: '2024-01-30',
        status: 'Pending',
        subtotal: 450,
        vat: 90,
    },
];

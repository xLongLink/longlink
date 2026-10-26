import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

// Schema defaults come from the same constants used to calculate monthly invoices.
const rates = schemas.zOrganizationUsage
    .omit({ users: true, solutions: true, max_solutions: true, stripe_enabled: true, has_payment_method: true })
    .parse({});

export const resources = [
    {
        id: 'users',
        resource: 'Users',
        included: `${rates.free_users} users`,
        publicIncluded: `First ${rates.free_users} users`,
        rate: `CHF ${(rates.user_monthly_price / 100).toFixed(2)} per additional user`,
    },
    {
        id: 'database',
        resource: 'Database',
        included: `${rates.free_database_bytes / 1024 ** 2} MiB`,
        publicIncluded: `${rates.free_database_bytes / 1024 ** 2} MiB database storage`,
        rate: `CHF ${(Number(rates.database_mib_monthly_price) / 100).toFixed(3)} per additional MiB`,
    },
    {
        id: 'storage',
        resource: 'File storage',
        included: `${rates.free_storage_bytes / 1024 ** 3} GiB`,
        publicIncluded: `${rates.free_storage_bytes / 1024 ** 3} GiB file storage`,
        rate: `CHF ${(Number(rates.storage_mib_monthly_price) / 100).toFixed(4)} per additional MiB`,
    },
];

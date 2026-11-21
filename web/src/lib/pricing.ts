import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export const capacityRates = schemas.zOrganizationUsage
    .pick({ cpu_monthly_price: true, ram_gib_monthly_price: true, storage_gib_monthly_price: true })
    .parse({});

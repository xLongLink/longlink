import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export const capacityRates = schemas.zOrganizationUsage
    .pick({ cpu_monthly_price: true, ram_gib_monthly_price: true, storage_gib_monthly_price: true })
    .parse({});

/** Rounds each resource line half-up to centimes, matching month-end billing. */
export function monthlyCapacityPrice(cpu: number, ramGiB: number, storageGiB: number) {
    if (![cpu, ramGiB, storageGiB].every(Number.isFinite)) return Number.NaN;

    let centimes = 0n;
    for (const [quantity, scale, rate] of [
        [cpu, 1000, capacityRates.cpu_monthly_price],
        [ramGiB, 1024 ** 3, capacityRates.ram_gib_monthly_price],
        [storageGiB, 1024 ** 3, capacityRates.storage_gib_monthly_price]
    ] as const) {
        const quantityUnits = Math.round(quantity * scale);
        if (!Number.isSafeInteger(quantityUnits) || quantityUnits < 0) return Number.NaN;

        const units = BigInt(quantityUnits);
        const divisor = BigInt(scale);
        centimes += (units * BigInt(rate) + divisor / 2n) / divisor;
    }

    return Number(centimes) / 100;
}

import { it, expect } from 'vitest';
import { monthlyCapacityPrice } from '@/lib/pricing';

it('rounds fractional RAM and storage lines half-up before summing the monthly preview', () => {
    // Arrange
    const ram = 0.001;
    const storage = 0.5;

    // Act
    const price = monthlyCapacityPrice(0, ram, storage);

    // Assert
    expect(price).toBe(0.02);
});

it.each([
    [1073741, 0.01],
    [1073742, 0.02]
])('bills %i RAM bytes in GiB at the exact centime rounding boundary', (ramBytes, expected) => {
    // Arrange
    const ramGiB = ramBytes / 1024 ** 3;
    const storageGiB = 0.5;

    // Act
    const price = monthlyCapacityPrice(0, ramGiB, storageGiB);

    // Assert
    expect(price).toBe(expected);
});

it('bills binary resource totals while preserving the vCPU rate', () => {
    // Arrange
    const ramGiB = (256 * 1024 ** 2) / 1024 ** 3;
    const storageGiB = 2147483648 / 1024 ** 3;

    // Act
    const price = monthlyCapacityPrice(0.5, ramGiB, storageGiB);

    // Assert
    expect(price).toBe(6.27);
});

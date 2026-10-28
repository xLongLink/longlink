import { it, expect } from 'vitest';
import { useCasePaths } from '@/platform/routes';

it('keeps the showcased screening process within the use-case collection', () => {
    // Assert
    expect(useCasePaths[0]).toBe('/use-cases');
    expect(useCasePaths).toContain('/use-cases/real-estate/property-acquisition-screening');
    expect(new Set(useCasePaths).size).toBe(useCasePaths.length);
});

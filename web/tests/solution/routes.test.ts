import { it, expect } from 'vitest';
import routes from '@/solution/routes';

it('sends local Solution paths through the one runtime route', () => {
    // Assert
    expect(routes).toEqual([{ path: '*', file: './solution.tsx' }]);
});

// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../../../../render';
import ViewLayout from '@/platform/routes/docs/sdk/views/ViewLayout';

it('rejects references absent from the published component catalog', () => {
    // Act / Assert
    expect(() => renderStatic(<ViewLayout name="MissingComponent" introduction="" />)).toThrow(
        'Missing View documentation: MissingComponent'
    );
});

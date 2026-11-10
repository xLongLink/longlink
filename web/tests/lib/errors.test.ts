import { it, expect } from 'vitest';
import { ApiError } from '@/lib/api';
import { createErrorReporter } from '@/lib/errors';

it('reports the same failure only once across workflow boundaries', () => {
    // Arrange
    const messages: string[] = [];
    const report = createErrorReporter((message) => messages.push(message));
    const failure = new ApiError('Permission required', 403);

    // Act
    report(failure);
    report(failure);
    report(new DOMException('Canceled', 'AbortError'));

    // Assert
    expect(messages).toEqual(['Permission required']);
});

it('does not expose internal diagnostics from generic failures in notifications', () => {
    // Arrange
    const messages: string[] = [];
    const report = createErrorReporter((message) => messages.push(message));

    const failure = new Error(
        'Database password: notification-secret; upstream=https://internal.example/private?token=transport-secret'
    );

    // Act
    report(failure);

    // Assert
    expect(messages).toEqual(['The request could not be completed. Please try again.']);
});

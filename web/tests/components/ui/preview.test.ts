import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { createElement } from 'react';
import { withMounted } from '../../render';
import { FileRequestContext, usePreview } from '@/components/ui/preview';

it('does not request host capability for an inline image', async () => {
    // Arrange
    const requests: string[] = [];

    const files = {
        preview: async (path: string) => {
            requests.push(path);

            return new Blob();
        },
        download: async () => undefined
    };

    function Probe() {
        const preview = usePreview('data:image/png;base64,AA==', true);

        return preview.status;
    }

    // Act
    await withMounted(createElement(FileRequestContext, { value: files }, createElement(Probe)), async (output) => {
        // Assert
        expect(output.textContent).toBe('ready');
        expect(requests).toEqual([]);
    });
});

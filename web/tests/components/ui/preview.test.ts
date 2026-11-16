import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { createElement } from 'react';
import { withMounted } from '../../render';
import { FileRequestContext, usePreview } from '@/components/custom/preview';

it.each(['data:image/png;base64,AA==', 'blob:caller-owned'])(
    'does not request host capability for inline image %s',
    async (src) => {
        // Arrange
        const requests: string[] = [];

        const files = {
            load: async (path: string) => {
                requests.push(path);

                return new Blob();
            },
            preview: async () => {
                throw new Error('Inline images must not open a host preview');
            },
            download: async () => undefined
        };

        function Probe() {
            const preview = usePreview(src);

            return preview.status;
        }

        // Act
        await withMounted(createElement(FileRequestContext, { value: files }, createElement(Probe)), async (output) => {
            // Assert
            expect(output.textContent).toBe('ready');
            expect(requests).toEqual([]);
        });
    }
);

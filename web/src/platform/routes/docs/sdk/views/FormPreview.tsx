import { Form } from '@/components/ui/Form';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, type ReactNode } from 'react';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

/** Exercises the real Form locally and displays submitted fields without sending API requests. */
export default function FormPreview({ children, stepped = false }: { children: ReactNode; stepped?: boolean }) {
    // Retain the latest submission as entries so repeated names and file objects remain intact.
    const [submission, setSubmission] = useState<[string, string | Blob][] | null>(null);

    // Capture documentation submissions locally without Platform credentials or networking.
    return (
        <Stack gap={3} onResetCapture={() => setSubmission(null)}>
            <Form action={(data) => setSubmission([...data.entries()])}>
                {stepped ? (
                    children
                ) : (
                    <>
                        {children}
                        <Stack direction="horizontal" gap={2}>
                            <Button type="submit" label="Submit" variant="primary" />
                            <Button type="reset" label="Reset" />
                        </Stack>
                    </>
                )}
            </Form>
            {submission !== null && (
                <Stack gap={2} role="status" aria-live="polite">
                    <Text weight="semibold">Submitted fields</Text>
                    <CodeBlock
                        language="json"
                        hasLanguageLabel={false}
                        code={JSON.stringify(
                            submission.map(([name, value]) => [
                                name,
                                value instanceof Blob
                                    ? {
                                          name: value instanceof File ? value.name : 'blob',
                                          size: value.size,
                                          type: value.type,
                                      }
                                    : value,
                            ]),
                            null,
                            2
                        )}
                    />
                </Stack>
            )}
        </Stack>
    );
}

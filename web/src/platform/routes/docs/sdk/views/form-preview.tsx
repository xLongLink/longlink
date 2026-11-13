import { Form } from '@/components/custom/form';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/shadcn/button';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeCodeBlock as CodeBlock } from '@/components/custom/native-code-block';

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
                            <Button type="submit" variant="default">
                                Submit
                            </Button>
                            <Button type="reset" variant="outline">
                                Reset
                            </Button>
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
                                          type: value.type
                                      }
                                    : value
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

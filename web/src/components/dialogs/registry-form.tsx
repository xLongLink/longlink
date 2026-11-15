import { api } from '@/lib/api';
import { Form } from '@/components/custom/form';
import { TextInput } from '@/components/custom/text-input';
import { Illustration } from '@/components/ui/illustration';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

export function RegistryForm({
    base,
    onSuccess,
    onClose,
    ...dialogProps
}: DialogProps & { base: string; onSuccess: () => Promise<void> }) {
    async function save(data: FormData) {
        const json = schemas.zRegistryCreateWritable.parse({ credential: data.get('credential') });
        await api.post(`${base}/registries`, { json });
        await onSuccess();
    }

    return (
        <Dialog {...dialogProps} onClose={onClose}>
            <Stack padding={8} minHeight="100%" justify="center" className="shrink-0">
                <Stack gap={8} width="100%" maxWidth={640} className="mx-auto">
                    <Stack gap={3} align="center">
                        <Illustration
                            src="/images/lock.png"
                            alt=""
                            className="size-20 object-contain"
                            decoding="async"
                        />
                        <Stack gap={0}>
                            <Heading level={2} className="text-center">
                                Connect a registry
                            </Heading>
                            <p className="text-muted-foreground text-center">
                                Allow LongLink to pull your private container images
                            </p>
                        </Stack>
                    </Stack>
                    <Form action={save}>
                        <Stack gap={3}>
                            <p>GitHub Container Registry (ghcr.io)</p>
                            <Stack>
                                <TextInput
                                    label="Personal access token (classic)"
                                    description="Requires the read:packages scope."
                                    type="password"
                                    placeholder="ghp_..."
                                    autoComplete="new-password"
                                    name="credential"
                                    required
                                />
                            </Stack>
                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                <Button label="Cancel" variant="ghost" type="button" onClick={onClose} />
                                <Button label="Save" variant="default" type="submit" />
                            </Stack>
                        </Stack>
                    </Form>
                </Stack>
            </Stack>
        </Dialog>
    );
}

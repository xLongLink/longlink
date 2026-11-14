import { api } from '@/lib/api';
import { FormDialog } from './form-dialog';
import { Form } from '@/components/custom/form';
import { TextInput } from '@/components/ui/text-input';
import { Illustration } from '@/components/ui/illustration';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

export function RegistryForm({
    base,
    onSuccess,
    onClose
}: {
    base: string;
    onSuccess: () => Promise<void>;
    onClose: () => void;
}) {
    async function save(data: FormData) {
        const json = schemas.zRegistryCreateWritable.parse({ credential: data.get('credential') });
        await api.post(`${base}/registries`, { json });
        await onSuccess();
    }

    return (
        <FormDialog gap={8} onClose={onClose}>
            <Stack gap={3} align="center">
                <Illustration src="/images/lock.png" alt="" className="size-20 object-contain" decoding="async" />
                <Stack gap={0}>
                    <Heading level={2} className="text-center">
                        Connect a registry
                    </Heading>
                    <Text as="p" className="text-muted-foreground text-center">
                        Allow LongLink to pull your private container images
                    </Text>
                </Stack>
            </Stack>
            <Form action={save}>
                <Stack gap={3}>
                    <Text as="p">GitHub Container Registry (ghcr.io)</Text>
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
        </FormDialog>
    );
}

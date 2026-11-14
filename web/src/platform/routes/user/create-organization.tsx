import { z } from 'zod';
import { api } from '@/lib/api';
import { Form } from '@/components/custom/form';
import { Dialog } from '@/components/custom/dialog';
import { Illustration } from '@/components/illustration';
import { TextInput } from '@/components/custom/text-input';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';
import { IllustratedDialogContent } from '@/platform/components/illustrated-dialog-content';

/** Notifies the parent after a successful organization creation request. */
export default function CreateOrganization({
    onClose,
    onSuccess
}: {
    onClose: () => void;
    onSuccess: () => Promise<void>;
}) {
    /** Creates the organization before awaiting the parent's success workflow. */
    async function createOrganization(data: FormData) {
        // Parse the form-owned name before applying organization request constraints.
        const name = z.string().trim().parse(data.get('name'));

        // Let the parent handle the successful creation.
        await api.post('/api/v1/organizations', { json: zOrganizationCreate.parse({ name }) });
        await onSuccess();
    }

    // Keep the split dialog compact and within the dynamic viewport.
    return (
        <Dialog
            isOpen
            paddingInline={0}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <IllustratedDialogContent
                illustration={
                    <Illustration
                        src="/images/organization-city.png"
                        alt="Hand-drawn city skyline reflected in water."
                        className="h-full w-full object-contain"
                        width={941}
                        height={1672}
                        decoding="async"
                    />
                }
            >
                <Stack height="100%" justify="center" width="max-content" maxWidth="100%" className="mx-auto">
                    <Form action={createOrganization}>
                        <Stack gap={10}>
                            <Stack gap={2} align="center">
                                <Illustration
                                    src="/images/organization.png"
                                    alt=""
                                    className="size-20 object-contain"
                                    width={1254}
                                    height={1254}
                                    decoding="async"
                                />
                                <Stack gap={0}>
                                    <Heading level={2} className="text-center">
                                        New organization
                                    </Heading>
                                    <Text as="p" className="text-muted-foreground text-center">
                                        A place for your workflows and data
                                    </Text>
                                </Stack>
                            </Stack>
                            {/* Let the subtitle size the column, then stretch the controls to match. */}
                            <Stack gap={4} width={0} className="min-w-full">
                                <TextInput label="Name" name="name" placeholder="Example LongLink" required />
                                <Button
                                    label="Create organization"
                                    variant="default"
                                    type="submit"
                                    style={{ width: '100%' }}
                                />
                            </Stack>
                        </Stack>
                    </Form>
                </Stack>
            </IllustratedDialogContent>
        </Dialog>
    );
}

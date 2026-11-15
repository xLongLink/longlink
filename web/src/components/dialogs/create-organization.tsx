import { z } from 'zod';
import { api } from '@/lib/api';
import { Form } from '@/components/custom/form';
import { TextInput } from '@/components/custom/text-input';
import { Illustration } from '@/components/ui/illustration';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';

/** Notifies the parent after a successful organization creation request. */
export default function CreateOrganization({
    onSuccess,
    ...dialogProps
}: DialogProps & { onSuccess: () => Promise<void> }) {
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
        <Dialog paddingInline={0} {...dialogProps}>
            <div className="flex h-[min(560px,calc(100dvh-calc(var(--spacing)*10)*4))] min-h-0 min-w-0 overflow-hidden">
                <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">
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
                                        <p className="text-muted-foreground text-center">
                                            A place for your workflows and data
                                        </p>
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
                </div>
                <div className="hidden min-w-0 flex-[0_0_50%] overflow-hidden bg-muted md:flex">
                    <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                        <Illustration
                            src="/images/organization-city.png"
                            alt="Hand-drawn city skyline reflected in water."
                            className="h-full w-full object-contain"
                            width={941}
                            height={1672}
                            decoding="async"
                        />
                    </Stack>
                </div>
            </div>
        </Dialog>
    );
}

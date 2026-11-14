import { Form } from '@/components/custom/form';
import { Selector } from '@/components/custom/selector';
import { TextInput } from '@/components/custom/text-input';
import { Illustration } from '@/components/ui/illustration';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeButton as Button } from '@/components/ui/native-button';
import { IllustratedDialogContent } from './illustrated-dialog-content';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

export function InviteMember({
    isOpen,
    canInviteAdmin,
    onClose,
    onSubmit
}: {
    isOpen: boolean;
    canInviteAdmin: boolean;
    onClose: () => void;
    onSubmit: (data: FormData) => Promise<void>;
}) {
    return (
        <FramedDialog open={isOpen} paddingInline={0} onOpenChange={(open) => !open && onClose()}>
            <IllustratedDialogContent
                illustration={
                    <Illustration
                        src="/images/invitation.png"
                        alt="Hand-drawn envelopes."
                        className="h-full w-full object-contain"
                        width={1223}
                        height={1286}
                        decoding="async"
                    />
                }
            >
                <Stack height="100%" justify="center" width="max-content" maxWidth="100%" className="mx-auto">
                    <Form action={onSubmit}>
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
                                        Invite user
                                    </Heading>
                                    <Text as="p" className="text-muted-foreground text-center">
                                        Send an invitation to join this organization.
                                    </Text>
                                </Stack>
                            </Stack>
                            <Stack gap={4} width={0} className="min-w-full">
                                <TextInput
                                    label="Email"
                                    type="email"
                                    name="email"
                                    placeholder="user@example.com"
                                    required
                                />
                                <Selector
                                    label="Role"
                                    name="role"
                                    defaultValue="write"
                                    hasClear={false}
                                    options={[
                                        { value: 'read', label: 'read', icon: 'lucide:eye-off' },
                                        { value: 'write', label: 'write', icon: 'lucide:arrow-up' },
                                        { value: 'maintain', label: 'maintain', icon: 'lucide:wrench' },
                                        ...(canInviteAdmin
                                            ? [{ value: 'admin', label: 'admin', icon: 'lucide:check-check' as const }]
                                            : [])
                                    ]}
                                />
                                <Button label="Invite" variant="default" type="submit" style={{ width: '100%' }} />
                            </Stack>
                        </Stack>
                    </Form>
                </Stack>
            </IllustratedDialogContent>
        </FramedDialog>
    );
}

import { Form } from '@/components/custom/form';
import { Selector } from '@/components/custom/selector';
import { TextInput } from '@/components/custom/text-input';
import { Illustration } from '@/components/ui/illustration';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';

export function InviteMember({
    canInviteAdmin,
    onSubmit,
    ...dialogProps
}: DialogProps & { canInviteAdmin: boolean; onSubmit: (data: FormData) => Promise<void> }) {
    return (
        <Dialog paddingInline={0} {...dialogProps}>
            <div className="flex h-[min(560px,calc(100dvh-calc(var(--spacing)*10)*4))] min-h-0 min-w-0 overflow-hidden">
                <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">
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
                                        <h2 className="font-semibold tracking-tight text-3xl text-center">
                                            Invite user
                                        </h2>
                                        <p className="text-muted-foreground text-center">
                                            Send an invitation to join this organization.
                                        </p>
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
                                            { value: 'read', label: 'read', icon: 'eye-off' },
                                            { value: 'write', label: 'write', icon: 'arrow-up' },
                                            { value: 'maintain', label: 'maintain', icon: 'wrench' },
                                            ...(canInviteAdmin
                                                ? [{ value: 'admin', label: 'admin', icon: 'check-check' as const }]
                                                : [])
                                        ]}
                                    />
                                    <Button label="Invite" variant="default" type="submit" style={{ width: '100%' }} />
                                </Stack>
                            </Stack>
                        </Form>
                    </Stack>
                </div>
                <div className="hidden min-w-0 flex-[0_0_50%] overflow-hidden bg-muted md:flex">
                    <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                        <Illustration
                            src="/images/invitation.png"
                            alt="Hand-drawn envelopes."
                            className="h-full w-full object-contain"
                            width={1223}
                            height={1286}
                            decoding="async"
                        />
                    </Stack>
                </div>
            </div>
        </Dialog>
    );
}

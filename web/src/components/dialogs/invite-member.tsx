import { z } from 'zod';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Selector } from '@/components/custom/selector';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { NativeButton as Button } from '@/components/custom/native-button';

export function InviteMember({
    canInviteAdmin,
    onSubmit,
    ...dialogProps
}: DialogProps & { canInviteAdmin: boolean; onSubmit: (data: FormData) => Promise<void> }) {
    const schema = z.object({
        email: z.email(),
        role: z.enum(canInviteAdmin ? ['read', 'write', 'maintain', 'admin'] : ['read', 'write', 'maintain'])
    });

    const form = useForm<z.input<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: '', role: 'write' }
    });

    const submit = useSubmit(
        async (values: z.output<typeof schema>) => {
            const data = new FormData();

            data.append('email', values.email);
            data.append('role', values.role);
            await onSubmit(data);
        },
        { onError: () => form.setError('root', { message: 'Could not send the invitation. Please try again.' }) }
    );

    return (
        <Dialog paddingInline={0} {...dialogProps}>
            <div className="flex h-[min(560px,calc(100dvh-calc(var(--spacing)*10)*4))] min-h-0 min-w-0 overflow-hidden">
                <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">
                    <Stack height="100%" justify="center" width="max-content" maxWidth="100%" className="mx-auto">
                        <form
                            onSubmit={(event) => {
                                void form.handleSubmit(submit)(event);
                            }}
                            noValidate
                            aria-busy={form.formState.isSubmitting}
                        >
                            <fieldset disabled={form.formState.isSubmitting} className="contents">
                                <Stack gap={10}>
                                    <Stack gap={2} align="center">
                                        <img
                                            src="/images/organization.png"
                                            alt=""
                                            className="size-20 object-contain invert dark:invert-0"
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
                                        <Controller
                                            name="email"
                                            control={form.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                                                    <Input
                                                        {...field}
                                                        id="invite-email"
                                                        type="email"
                                                        placeholder="user@example.com"
                                                        aria-invalid={fieldState.invalid}
                                                    />
                                                    <FieldError errors={[fieldState.error]} />
                                                </Field>
                                            )}
                                        />
                                        <Controller
                                            name="role"
                                            control={form.control}
                                            render={({ field, fieldState }) => (
                                                <div className="flex flex-col gap-2">
                                                    <Selector
                                                        label="Role"
                                                        value={field.value}
                                                        onChange={(value) => field.onChange(value ?? 'write')}
                                                        hasClear={false}
                                                        options={[
                                                            { value: 'read', label: 'read', icon: 'eye-off' },
                                                            { value: 'write', label: 'write', icon: 'arrow-up' },
                                                            { value: 'maintain', label: 'maintain', icon: 'wrench' },
                                                            ...(canInviteAdmin
                                                                ? [
                                                                      {
                                                                          value: 'admin',
                                                                          label: 'admin',
                                                                          icon: 'check-check' as const
                                                                      }
                                                                  ]
                                                                : [])
                                                        ]}
                                                    />
                                                    <FieldError errors={[fieldState.error]} />
                                                </div>
                                            )}
                                        />
                                        <Button
                                            label="Invite"
                                            variant="default"
                                            type="submit"
                                            style={{ width: '100%' }}
                                        />
                                    </Stack>
                                </Stack>
                            </fieldset>
                            <FieldError errors={[form.formState.errors.root]} />
                        </form>
                    </Stack>
                </div>
                <div className="hidden min-w-0 flex-[0_0_50%] overflow-hidden bg-muted md:flex">
                    <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                        <img
                            src="/images/invitation.png"
                            alt="Hand-drawn envelopes."
                            className="h-full w-full object-contain invert dark:invert-0"
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

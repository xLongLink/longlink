import { z } from 'zod';
import ViewLayout from './view-layout';
import { RequestContext } from '@/lib/view-capabilities';
import { Box, Button, Controller, Form, Select, Stack, Text, useForm } from '@/components/longlink';

const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' }
];

const schema = z.object({ status: z.enum(['open', 'closed']) });

export function FormExample() {
    return (
        <RequestContext value={{ request: async () => null }}>
            <OrderStatus />
        </RequestContext>
    );
}

function OrderStatus() {
    const form = useForm('/api/orders', { schema, defaultValues: { status: 'open' } });
    const { errors, isDirty, isSubmitting, isSubmitSuccessful } = form.formState;

    return (
        <Box width={320} maxWidth="100%">
            <Form onSubmit={form.onSubmit} noValidate>
                <Stack gap={3}>
                    <Controller
                        name="status"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Select
                                label="Status"
                                name={field.name}
                                value={field.value}
                                onValueChange={field.onChange}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                error={fieldState.error?.message}
                                options={statusOptions}
                            />
                        )}
                    />
                    <Stack direction="horizontal" gap={2}>
                        <Button type="submit" disabled={isSubmitting}>
                            Save
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!isDirty || isSubmitting}
                            onClick={() => form.reset()}
                        >
                            Reset
                        </Button>
                    </Stack>
                    {errors.root?.message && <Text role="alert">{errors.root.message}</Text>}
                    {isSubmitSuccessful && <Text role="status">Status saved.</Text>}
                </Stack>
            </Form>
        </Box>
    );
}

export default function FormPage() {
    return (
        <ViewLayout
            name="Form"
            relatedComponents={['Controller']}
            example={{
                title: 'Form',
                preview: <FormExample />,
                code: `const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' }
];

const schema = z.object({ status: z.enum(['open', 'closed']) });

export default function OrderStatus() {
  const form = useForm('/api/orders', { schema, defaultValues: { status: 'open' } });
  const { errors, isDirty, isSubmitting, isSubmitSuccessful } = form.formState;

  return (
    <Box width={320} maxWidth="100%">
      <Form onSubmit={form.onSubmit} noValidate>
        <Stack gap={3}>
          <Controller
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Select
                label="Status"
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                error={fieldState.error?.message}
                options={statusOptions}
              />
            )}
          />
          <Stack direction="horizontal" gap={2}>
            <Button type="submit" disabled={isSubmitting}>Save</Button>
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || isSubmitting}
              onClick={() => form.reset()}
            >
              Reset
            </Button>
          </Stack>
          {errors.root?.message && <Text role="alert">{errors.root.message}</Text>}
          {isSubmitSuccessful && <Text role="status">Status saved.</Text>}
        </Stack>
      </Form>
    </Box>
  );
}`
            }}
        />
    );
}

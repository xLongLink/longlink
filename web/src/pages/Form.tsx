import { Form } from '@/components/viavai/Form';
import { sampleFormSchema } from '@/lib/example-data';

export default function FormPage() {
    return <Form schema={sampleFormSchema} />;
}

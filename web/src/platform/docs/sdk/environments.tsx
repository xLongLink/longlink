import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

export { metadata } from './environments.metadata';

export default function EnvironmentsDocumentation() {
    return (
        <Stack gap={5}>
            <Heading id="environments" level={1}>
                Environments
            </Heading>
            <Text as="p">
                LongLink uses{' '}
                <Link
                    href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/"
                    hasUnderline
                    isExternalLink
                    type="inherit"
                >
                    Pydantic Settings
                </Link>{' '}
                to define and manage Application configuration.
            </Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={
                    'from longlink import Environments\nfrom pydantic import Field\n\nclass Env(Environments):\n    """Project-specific environment model."""\n\n    REQUIRED: str = Field(description="Required value")\n    OPTIONAL: str = Field(default="optional", description="Optional value")'
                }
                language="python"
            />
        </Stack>
    );
}

import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/sdk/environments.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Environments</H1>
    <P>The <Code>Environments</Code> class defines and validates environment variables for an application.</P>
    <P>The class is a wrapper around <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/">Pydantic Settings</A>. LongLink loads and validates all environment variables at application startup.</P>
    <P>This ensures that configuration errors are detected early, before the application starts handling requests.</P>
    <H2>Usage</H2>
    <Pre lang="python">from longlink import Environments, LongLink


class Env(Environments):
    """Project-specific environment model."""

    FEATURE_FLAG: bool
    EXTERNAL_API: str


env = Env()
app = LongLink(env=env)</Pre>
    <H2>Resources</H2>
    <Ul>
      <Li><A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/">Pydantic Settings</A></Li>
    </Ul>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;

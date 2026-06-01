import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/sdk/storage.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Storage</H1>
    <P>LongLink SDK exposes a native <Code>fs</Code> object. You can use it like a standard <A href="https://filesystem-spec.readthedocs.io/en/latest/">fsspec</A> filesystem.</P>
    <H2>Usage</H2>
    <Pre lang="python">from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")</Pre>
    <H2>Resources</H2>
    <Ul>
      <Li><A href="https://filesystem-spec.readthedocs.io/en/latest/">fsspec Documentation</A></Li>
      <Li><A href="https://github.com/fsspec/filesystem_spec">fsspec GitHub</A></Li>
    </Ul>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;

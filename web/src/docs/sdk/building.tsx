import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/sdk/building.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Building</H1>
    <Ul>
      <Li>Applications can be built using Docker.</Li>
      <Li><Code>longlink build</Code> generates the <Code>Dockerfile</Code> and the <Code>manifest.json</Code>.</Li>
      <Li>Once containerized, applications can be pushed to any registry.</Li>
      <Li>Applications can be connected to the control plane and deployed.</Li>
    </Ul>
    <Tabs defaultValue="pip">
      <Tab value="pip" label="pip">
        <Pre lang="bash">longlink build</Pre>
      </Tab>
      <Tab value="uv" label="uv">
        <Pre lang="bash">uv run longlink build</Pre>
      </Tab>
    </Tabs>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;

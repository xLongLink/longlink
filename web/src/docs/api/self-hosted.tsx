import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/api/self-hosted.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Self-hosted Control Plane</H1>
    <P>Use self-hosted mode when you run the LongLink control plane in your own infrastructure.</P>
    <H2>Infrastructure</H2>
    <P>Provide these systems before you deploy LongLink:</P>
    <Ul>
      <Li>A Kubernetes cluster for the control plane and application workloads</Li>
      <Li>A PostgreSQL server for database provisioning</Li>
      <Li>S3-compatible object storage for files and artifacts</Li>
    </Ul>
    <H2>Required Environment Variables</H2>
    <P>Configure the API container with session and control-plane settings. Database, storage, and compute backends are registered through the API.</P>
    <H3>Session</H3>
    <Ul>
      <Li><Code>SESSION_KEY</Code></Li>
      <Li><Code>DATABASE_URL</Code></Li>
      <Li><Code>URL</Code></Li>
    </Ul>
    <H3>Database</H3>
    <P>Register database backends after startup. Their connection details live in the control plane database, not in API env vars.</P>
    <H3>Storage</H3>
    <P>Register storage backends after startup. The API reads bucket connection details from the storage registry.</P>
    <H3>Compute</H3>
    <P>Register compute backends after startup. The API bootstraps a shared cluster proxy from the registered kubeconfig, then uses the configured ingress host for app proxying.</P>
    <H2>Deployment Model</H2>
    <P>Deploy the control plane container and application containers in the same Kubernetes cluster.</P>
    <P>This keeps control-plane traffic inside the cluster boundary and avoids public ingress for application routing.</P>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;

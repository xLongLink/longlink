import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/api/index.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Control Plane</H1>
    <P>The Control Plane is the central system that manages and governs all applications in LongLink. It acts as the single entry point between users and application services, handling authentication, authorization, request routing, and observability.</P>
    <P>Applications do not interact directly with external clients. Every request flows through the control plane, ensuring that access is controlled, behavior is consistent, and all operations are traceable.</P>
    <H2>Infrastructure</H2>
    <P>The control plane manages and connects to the core infrastructure required to run applications:</P>
    <Ul>
      <Li>Database, isolated per application</Li>
      <Li>Object storage, S3-compatible</Li>
      <Li>Compute, Docker images running on Kubernetes</Li>
      <Li>Identity provider, OIDC-compatible</Li>
    </Ul>
    <H2>Request Flow &amp; Permissioning</H2>
    <P>All interactions with applications are proxied through the control plane. It enforces authentication and permissions before routing requests and returning responses.</P>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;

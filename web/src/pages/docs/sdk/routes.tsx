import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-07',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/routes.tsx',
};

export const content = (
    <Stack>
        <Heading id="endpoints" level="h1">
            Endpoints
        </Heading>
        <P>LongLink SDK wraps FastAPI.</P>
        <P>You define endpoint handlers on the wrapped FastAPI app.</P>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import LongLink, Router, get_user
from pydantic import BaseModel

router = Router()


class SampleResponse(BaseModel):
    id: int
    name: str


@router.get("/sample", response_model=SampleResponse)
async def sample() -> SampleResponse:
    user = get_user()
    return SampleResponse(id=1, name=user.role)


app = LongLink()
app.include_router(router)`}</CodeBlock>
        <P>
            SDK API routes are exposed under <Code>/api</Code> and use method-level role defaults. <Code>GET</Code>
            uses <Code>read</Code>, <Code>POST</Code>, <Code>PUT</Code>, and <Code>PATCH</Code> use{' '}
            <Code>write</Code>, and <Code>DELETE</Code> uses <Code>maintain</Code>. Use <Code>get_user()</Code> to read
            the scoped user for audit-aware business logic.
        </P>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <Ul>
            <Li>
                <A href="https://fastapi.tiangolo.com/tutorial/">FastAPI tutorial</A>
            </Li>
            <Li>
                <A href="https://fastapi.tiangolo.com/tutorial/path-operation-configuration/">
                    Path operation decorators
                </A>
            </Li>
            <Li>
                <A href="https://fastapi.tiangolo.com/tutorial/body/">Request body with Pydantic</A>
            </Li>
            <Li>
                <A href="https://fastapi.tiangolo.com/tutorial/dependencies/">Dependencies</A>
            </Li>
            <Li>
                <A href="https://fastapi.tiangolo.com/tutorial/response-model/">Response models</A>
            </Li>
        </Ul>
    </Stack>
);

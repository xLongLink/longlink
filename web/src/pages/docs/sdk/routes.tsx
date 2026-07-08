import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-08',
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
        <CodeBlock language="python">{`from longlink import LongLink, Router
from pydantic import BaseModel

router = Router()


class SampleResponse(BaseModel):
    id: int
    name: str


@router.get("/sample", response_model=SampleResponse)
async def sample() -> SampleResponse:
    return SampleResponse(id=1, name="Example")


app = LongLink()
app.include_router(router)`}</CodeBlock>
        <P>
            SDK API routes are exposed under <Code>/api</Code>. Login, membership, and runtime authorization are handled
            by the LongLink control plane before production traffic reaches the application runtime.
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

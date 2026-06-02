import { A } from '@/components/ui/a';
import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/routes.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="endpoints" level="h1">
            Endpoints
        </Heading>
        <p className="leading-7">LongLink SDK wraps FastAPI.</p>
        <p className="leading-7">You define endpoint handlers on the wrapped FastAPI app.</p>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import App, Router, Context
from pydantic import BaseModel

router = Router()


class SampleResponse(BaseModel):
    id: int
    name: str


@router.get("/sample", response_model=SampleResponse)
async def sample(ctx: Context) -> SampleResponse:
    return SampleResponse(id=1, name="apple")


app = App()
app.register(router)`}</CodeBlock>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <A href="https://fastapi.tiangolo.com/tutorial/">FastAPI tutorial</A>
            </li>
            <li>
                <A href="https://fastapi.tiangolo.com/tutorial/path-operation-configuration/">Path operation decorators</A>
            </li>
            <li>
                <A href="https://fastapi.tiangolo.com/tutorial/body/">Request body with Pydantic</A>
            </li>
            <li>
                <A href="https://fastapi.tiangolo.com/tutorial/dependencies/">Dependencies</A>
            </li>
            <li>
                <A href="https://fastapi.tiangolo.com/tutorial/response-model/">Response models</A>
            </li>
        </ul>
    </div>
);

import { A } from '@/components/ui/a';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';

/** Renders the SDK routes page. */
export default function SdkRoutesPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">Endpoints</Heading>
                <P className="max-w-3xl text-muted-foreground">LongLink SDK wraps FastAPI.</P>
                <P className="max-w-3xl text-muted-foreground">
                    You define endpoint handlers on the wrapped FastAPI app.
                </P>
            </section>

            <section className="space-y-4">
                <Heading id="usage" level="h2" className="text-foreground">Usage</Heading>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`from longlink import App, Router, Context
from pydantic import BaseModel

router = Router()

# Sample response model
class SampleResponse(BaseModel):
    id: int
    name: str


@router.get("/sample", response_model=SampleResponse)
async def sample(ctx: Context) -> SampleResponse:
    return SampleResponse(id=1, name="apple")


app = App()
app.register(router)`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="resources" level="h2" className="text-foreground">Resources</Heading>
                <A href="https://fastapi.tiangolo.com/tutorial/" target="_blank" rel="noopener noreferrer">FastAPI tutorial</A>
                <A href="https://fastapi.tiangolo.com/tutorial/path-operation-configuration/" target="_blank" rel="noopener noreferrer">Path operation decorators</A>
                <A href="https://fastapi.tiangolo.com/tutorial/body/" target="_blank" rel="noopener noreferrer">Request body with Pydantic</A>
                <A href="https://fastapi.tiangolo.com/tutorial/dependencies/" target="_blank" rel="noopener noreferrer">Dependencies</A>
                <A href="https://fastapi.tiangolo.com/tutorial/response-model/" target="_blank" rel="noopener noreferrer">Response models</A>
            </section>
        </article>
    );
}

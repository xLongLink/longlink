import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/sdk/routes.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Endpoints</H1>
    <P>LongLink SDK wraps FastAPI.</P>
    <P>You define endpoint handlers on the wrapped FastAPI app.</P>
    <H2>Usage</H2>
    <Pre lang="python">from longlink import App, Router, Context
from pydantic import BaseModel

router = Router()


class SampleResponse(BaseModel):
    id: int
    name: str


@router.get("/sample", response_model=SampleResponse)
async def sample(ctx: Context) -> SampleResponse:
    return SampleResponse(id=1, name="apple")


app = App()
app.register(router)</Pre>
    <H2>Resources</H2>
    <Ul>
      <Li><A href="https://fastapi.tiangolo.com/tutorial/">FastAPI tutorial</A></Li>
      <Li><A href="https://fastapi.tiangolo.com/tutorial/path-operation-configuration/">Path operation decorators</A></Li>
      <Li><A href="https://fastapi.tiangolo.com/tutorial/body/">Request body with Pydantic</A></Li>
      <Li><A href="https://fastapi.tiangolo.com/tutorial/dependencies/">Dependencies</A></Li>
      <Li><A href="https://fastapi.tiangolo.com/tutorial/response-model/">Response models</A></Li>
    </Ul>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;

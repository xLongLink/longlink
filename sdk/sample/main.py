from app.routes.sample import router
from longlink import LongLink, issues_page, sample_page

app = LongLink()
app.include_router(router)

issues_page()
sample_page()

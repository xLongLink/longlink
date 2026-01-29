import unittest
from httpx import AsyncClient, ASGITransport
from viavai import ViaVai, get


app = ViaVai()


@get("/query/{item}?{start}&{end}")
async def sample_query_params(item: str, start: int = 0, end: int = 0):
    return f"{item}:{start}-{end}"


@get("/query-keyed/{item}?start={start}&end={end}")
async def sample_query_keyed(item: str, start: int = 5, end: int = 15):
    return f"{item}:{start}-{end}"


class TestQueryParams(unittest.IsolatedAsyncioTestCase):
    """
    Test handling of dynamic path and query parameters.
    """

    async def test_query_params_with_values(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/query/widget?start=2&end=9")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "widget:2-9")

    async def test_query_params_defaults(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/query/widget")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "widget:0-0")

    async def test_query_params_keyed_template(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/query-keyed/gadget?start=7&end=12")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "gadget:7-12")

    async def test_query_params_keyed_defaults(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/query-keyed/gadget")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "gadget:5-15")


if __name__ == '__main__':
    unittest.main()

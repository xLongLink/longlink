import unittest
from httpx import AsyncClient, ASGITransport
from viavai import ViaVai, get


app = ViaVai()


@get("/text-body")
async def sample_text_body():
    return "plain text response"


@get("/bytes-body")
async def sample_bytes_body():
    return b"binary response"


@get("/number-body")
async def sample_number_body():
    return 12345


class TestResponseBodies(unittest.IsolatedAsyncioTestCase):
    """
    Test how different response bodies are serialized.
    """

    async def test_text_body(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/text-body")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("content-type"), "text/plain")
        self.assertEqual(response.text, "plain text response")

    async def test_bytes_body(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/bytes-body")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("content-type"), "text/plain")
        self.assertEqual(response.content, b"binary response")

    async def test_number_body(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/number-body")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("content-type"), "text/plain")
        self.assertEqual(response.text, "12345")


if __name__ == '__main__':
    unittest.main()

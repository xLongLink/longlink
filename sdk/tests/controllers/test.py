import unittest
from httpx import AsyncClient, ASGITransport
from viavai import ViaVai

app = ViaVai()


class TestViaVaiHTTP(unittest.IsolatedAsyncioTestCase):
    async def test_404(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport) as client:
            response = await client.get("/not-found")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.text, "Not Found")


if __name__ == '__main__':
    unittest.main()

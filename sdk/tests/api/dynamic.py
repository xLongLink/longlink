import unittest
from httpx import AsyncClient, ASGITransport
from viavai import ViaVai
from viavai import get, post, put, delete, patch


app = ViaVai()


@get("/{item_id}")
async def sample_get(item_id: str):
    return f"GET response for {item_id}"


class TestDynamicRoutes(unittest.IsolatedAsyncioTestCase):
    """
    Test the HTTP methods with dynamic path parameters
    """

    async def test_get(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/abc123")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "GET response for abc123")



if __name__ == '__main__':
    unittest.main()

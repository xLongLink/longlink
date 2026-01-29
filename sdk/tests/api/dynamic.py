import unittest
from httpx import AsyncClient, ASGITransport
from viavai import ViaVai
from viavai import get, post, put, delete, patch


app = ViaVai()


@get("/{item_id}")
async def sample_get(item_id: str):
    return f"GET response for {item_id}"


@post("/{item_id}")
async def sample_post(item_id: str):
    return f"POST response for {item_id}"


@put("/{item_id}")
async def sample_put(item_id: str):
    return f"PUT response for {item_id}"


@delete("/{item_id}")
async def sample_delete(item_id: str):
    return f"DELETE response for {item_id}"


@patch("/{item_id}")
async def sample_patch(item_id: str):
    return f"PATCH response for {item_id}"


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

    async def test_post(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post("/item42")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "POST response for item42")

    async def test_put(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.put("/item99")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "PUT response for item99")

    async def test_delete(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.delete("/item7")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "DELETE response for item7")

    async def test_patch(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.patch("/item88")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "PATCH response for item88")


if __name__ == '__main__':
    unittest.main()

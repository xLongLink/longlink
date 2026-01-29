import unittest
from httpx import AsyncClient, ASGITransport
from viavai import ViaVai
from viavai import get, post, put, delete, patch


app = ViaVai()


@get("/")
async def sample_get():
    return "GET response"

@post("/")
async def sample_post():
    return "POST response"

@put("/")
async def sample_put():
    return "PUT response"

@delete("/")
async def sample_delete():
    return "DELETE response"

@patch("/")
async def sample_patch():
    return "PATCH response"


class TestSimpleMethods(unittest.IsolatedAsyncioTestCase):
    async def test_get(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "GET response")

    async def test_post(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "POST response")

    async def test_put(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.put("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "PUT response")

    async def test_delete(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.delete("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "DELETE response")

    async def test_patch(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.patch("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "PATCH response")
        

if __name__ == '__main__':
    unittest.main()

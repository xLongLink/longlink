import unittest
from httpx import AsyncClient, ASGITransport

from pydantic import BaseModel

from viavai import ViaVai, post


app = ViaVai()


class UserModel(BaseModel):
    id: int
    username: str


@post("/user")
async def valid_user() -> UserModel:
    return UserModel(id=1, username="testuser")


@post("/user/bad")
async def invalid_user() -> UserModel:
    return {"id": 2, "username": "bad"}


class TestResponseModelEnforcement(unittest.IsolatedAsyncioTestCase):
    async def test_returns_model_when_type_hint_matches(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post("/user")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("content-type"), "application/json")
        self.assertEqual(response.json(), {"id": 1, "username": "testuser"})

    async def test_returns_error_when_type_hint_mismatch(self):
        transport = ASGITransport(app=app)

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post("/user/bad")

        self.assertEqual(response.status_code, 500)
        self.assertIn("Invalid response type", response.text)


if __name__ == '__main__':
    unittest.main()

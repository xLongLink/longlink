import asyncio
import json
import sys
import types
import unittest


if "pydantic_settings" not in sys.modules:
    pydantic_settings = types.ModuleType("pydantic_settings")

    class BaseSettings:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    def SettingsConfigDict(**kwargs):
        return kwargs

    pydantic_settings.BaseSettings = BaseSettings
    pydantic_settings.SettingsConfigDict = SettingsConfigDict
    sys.modules["pydantic_settings"] = pydantic_settings

from longlink.app import LongLink


class TestLongLinkApp(unittest.TestCase):
    def test_root_returns_app_information_as_json(self):
        app = LongLink(
            title="Demo App",
            description="Demo description",
            version="1.2.3",
        )
        messages = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            messages.append(message)

        asyncio.run(
            app(
                {
                    "type": "http",
                    "method": "GET",
                    "path": "/",
                    "query_string": b"",
                },
                receive,
                send,
            )
        )

        self.assertEqual(messages[0]["type"], "http.response.start")
        self.assertEqual(messages[0]["status"], 200)
        self.assertIn((b"content-type", b"application/json"), messages[0]["headers"])

        self.assertEqual(messages[1]["type"], "http.response.body")
        self.assertEqual(
            json.loads(messages[1]["body"]),
            {
                "name": "Demo App",
                "description": "Demo description",
                "version": "1.2.3",
            },
        )


if __name__ == "__main__":
    unittest.main()

from typing import get_type_hints

from pydantic import BaseModel

from longlink.cron import Cron
from longlink.router import Router


class LongLink(Router, Cron):
    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return

        method = scope['method']
        path = scope['path']

        query_string = scope.get('query_string', b'')
        if isinstance(query_string, bytes):
            query_string = query_string.decode()

        handler, params = self.match(method, path, query_string=query_string)

        if not handler:
            await send({
                'type': 'http.response.start',
                'status': 404,
                'headers': [],
            })
            await send({
                'type': 'http.response.body',
                'body': b'Not Found',
            })
            return

        if params:
            body = await handler(**params)
        else:
            body = await handler()

        is_page_handler = any(route.handler is handler for route in self._pages)

        return_type = get_type_hints(handler).get('return')
        if is_page_handler:
            from longlink.ui import Page
            import json

            if return_type is not Page or not isinstance(body, Page):
                await send({
                    'type': 'http.response.start',
                    'status': 500,
                    'headers': [(b'content-type', b'text/plain')],
                })
                await send({
                    'type': 'http.response.body',
                    'body': b'Invalid response type. Page routes must return longlink.ui.Page.',
                })
                return

            headers = [(b'content-type', b'application/json')]
            body_bytes = json.dumps(list(body)).encode()
        elif return_type and isinstance(return_type, type) and issubclass(return_type, BaseModel):
            if not isinstance(body, return_type):
                await send({
                    'type': 'http.response.start',
                    'status': 500,
                    'headers': [(b'content-type', b'text/plain')],
                })
                await send({
                    'type': 'http.response.body',
                    'body': f'Invalid response type. Expected {return_type.__name__}.'.encode(),
                })
                return

            if hasattr(body, 'model_dump_json'):
                response_body = body.model_dump_json()
            else:
                response_body = body.json()
            headers = [(b'content-type', b'application/json')]
            body_bytes = response_body.encode()
        else:
            if isinstance(body, dict):
                import json

                headers = [(b'content-type', b'application/json')]
                body_bytes = json.dumps(body).encode()
            else:
                headers = [(b'content-type', b'text/plain')]
                if isinstance(body, bytes):
                    body_bytes = body
                else:
                    body_bytes = str(body).encode()

        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': headers,
        })
        await send({
            'type': 'http.response.body',
            'body': body_bytes,
        })

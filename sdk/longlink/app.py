import inspect
import json
from typing import Any, get_type_hints

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

        body_payload = await self._read_json_body(scope, receive)
        call_params = self._merge_body_params(handler, params, body_payload)

        if call_params:
            body = await handler(**call_params)
        else:
            body = await handler()

        is_page_handler = any(route.handler is handler for route in self._pages)

        return_type = get_type_hints(handler).get('return')
        if is_page_handler:
            from longlink.ui import Page

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

    async def _read_json_body(self, scope, receive) -> dict[str, Any] | None:
        method = scope.get('method', '').upper()
        if method in {'GET', 'HEAD', 'OPTIONS'}:
            return None

        body = b''
        more_body = True
        while more_body:
            message = await receive()
            if message.get('type') != 'http.request':
                continue

            body += message.get('body', b'')
            more_body = message.get('more_body', False)

        if body == b'':
            return None

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return None

        if not isinstance(payload, dict):
            return None

        return payload

    def _merge_body_params(self, handler, params: dict[str, Any], payload: dict[str, Any] | None) -> dict[str, Any]:
        if payload is None:
            return params

        merged_params = dict(params)
        signature = inspect.signature(handler)
        annotations = get_type_hints(handler)

        missing_parameters = [
            name for name in signature.parameters
            if name not in merged_params
        ]

        if len(missing_parameters) == 1:
            candidate = missing_parameters[0]
            annotation = annotations.get(candidate)
            if isinstance(annotation, type) and issubclass(annotation, BaseModel):
                merged_params[candidate] = annotation.model_validate(payload)
                return merged_params

        for key, value in payload.items():
            if key in signature.parameters and key not in merged_params:
                merged_params[key] = value

        return merged_params

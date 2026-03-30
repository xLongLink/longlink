"""Metadata route."""

from longlink import get

from longlink.envs import Envs, envs
from longlink.metadata import metadata


def _required_envs() -> list[str]:
    return [
        field_name.upper()
        for field_name, field in Envs.model_fields.items()
        if field.is_required()
    ]


@get('/metadata.json')
async def get_metadata_information(key: str = ''):
    if key != envs.KEY:
        return {
            'detail': 'Invalid app key',
            'status': 401,
        }

    return {
        **metadata.model_dump(),
        'runtime': 'python-sdk',
        'required_envs': _required_envs(),
    }

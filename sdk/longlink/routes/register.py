"""Registration route."""

from longlink import get

from longlink.envs import Envs


def _required_envs() -> list[str]:
    return [
        field_name.upper()
        for field_name, field in Envs.model_fields.items()
        if field.is_required()
    ]


@get('/register')
async def get_registration_information():
    return {
        'required_envs': _required_envs(),
    }

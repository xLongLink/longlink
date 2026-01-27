def get(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


def post(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


def put(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


def delete(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


def cron(hour: int = 0, minute: int = 0):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# Pydantic models are uses for API request and response validation

# There is one logic that manage everything.
# ViaVai manage the deployment, the database, the authentication as well the views.
# Ideally ViaVai manage the migrations as well, so that when a new version is deployed the migrations schema
# is automatically generated and applied.
# When an applications is updated, viavai handle the backup of the previous version, so that in case of failure
# the previous version can be restored with a simple click.
# For each application deployed on Vivai, there is a monthly cost related to the resourced used
# viavai fee + license fee??

# Each viavai app have a:
# A database (sqlite for small apps, postgres for bigger apps, or a table in the database??)
# The database can be stored anywhere (any provider)

# Built with Pydantic

from viavai import get, post, put, delete, cron


@get
def foo_get():
    pass


@post
def foo_post():
    pass


@put
def foo_put():
    pass


@delete
def foo_delete():
    pass


# Shall expose an endpoint and somehow this shall be called.
@cron(hour=0)
def foo_cron():
    pass


# TODO: Websockets
# @websocket
# def foo_ws():
#     pass

# TODO: Logs??
# TODO: exception_handler(ValueError)
# def value_error_handler(_, exc: ValueError):
#     return JSONResponse(
#         status_code=400,
#         content={"detail": str(exc)}
#     )
import enum


class AddressType(str, enum.Enum):
    operating = "operating"
    registered = "registered"
    
from enum import StrEnum


# https://unstats.un.org/unsd/classifications/Econ/
class ISICSectionCode(StrEnum):
    """ISIC Rev.4 Section codes (top-level)."""

    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"
    H = "H"
    I = "I"  # noqa: E741
    J = "J"
    K = "K"
    L = "L"
    M = "M"
    N = "N"
    O = "O"  # noqa: E741
    P = "P"
    Q = "Q"
    R = "R"
    S = "S"
    T = "T"
    U = "U"


class ISICSectionName(StrEnum):
    """ISIC Rev.4 Section names (top-level industries)."""

    A = "Agriculture, forestry and fishing"
    B = "Mining and quarrying"
    C = "Manufacturing"
    D = "Electricity, gas, steam and air conditioning supply"
    E = "Water supply; sewerage, waste management and remediation activities"
    F = "Construction"
    G = "Wholesale and retail trade; repair of motor vehicles and motorcycles"
    H = "Transportation and storage"
    I = "Accommodation and food service activities"  # noqa: E741
    J = "Information and communication"
    K = "Financial and insurance activities"
    L = "Real estate activities"
    M = "Professional, scientific and technical activities"
    N = "Administrative and support service activities"
    O = "Public administration and defence; compulsory social security"  # noqa: E741
    P = "Education"
    Q = "Human health and social work activities"
    R = "Arts, entertainment and recreation"
    S = "Other service activities"
    T = (
        "Activities of households as employers; undifferentiated goods- and "
        "services-producing activities of households for own use"
    )
    U = "Activities of extraterritorial organizations and bodies"

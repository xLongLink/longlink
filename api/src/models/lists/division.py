from enum import Enum


# https://unstats.un.org/unsd/classifications/Econ/
class ISICDivisionCode(str, Enum):
    """ISIC Rev.4 Divisions (Section + 2-digit division code)."""

    # A — Agriculture, forestry and fishing
    A01 = "A01"
    A02 = "A02"
    A03 = "A03"

    # B — Mining and quarrying
    B05 = "B05"
    B06 = "B06"
    B07 = "B07"
    B08 = "B08"
    B09 = "B09"

    # C — Manufacturing
    C10 = "C10"
    C11 = "C11"
    C12 = "C12"
    C13 = "C13"
    C14 = "C14"
    C15 = "C15"
    C16 = "C16"
    C17 = "C17"
    C18 = "C18"
    C19 = "C19"
    C20 = "C20"
    C21 = "C21"
    C22 = "C22"
    C23 = "C23"
    C24 = "C24"
    C25 = "C25"
    C26 = "C26"
    C27 = "C27"
    C28 = "C28"
    C29 = "C29"
    C30 = "C30"
    C31 = "C31"
    C32 = "C32"
    C33 = "C33"

    # D — Electricity, gas, steam and air conditioning supply
    D35 = "D35"

    # E — Water supply; sewerage, waste management and remediation
    E36 = "E36"
    E37 = "E37"
    E38 = "E38"
    E39 = "E39"

    # F — Construction
    F41 = "F41"
    F42 = "F42"
    F43 = "F43"

    # G — Wholesale and retail trade; repair of motor vehicles
    G45 = "G45"
    G46 = "G46"
    G47 = "G47"

    # H — Transportation and storage
    H49 = "H49"
    H50 = "H50"
    H51 = "H51"
    H52 = "H52"
    H53 = "H53"

    # I — Accommodation and food service
    I55 = "I55"
    I56 = "I56"

    # J — Information and communication
    J58 = "J58"
    J59 = "J59"
    J60 = "J60"
    J61 = "J61"
    J62 = "J62"
    J63 = "J63"

    # K — Financial and insurance activities
    K64 = "K64"
    K65 = "K65"
    K66 = "K66"

    # L — Real estate activities
    L68 = "L68"

    # M — Professional, scientific and technical
    M69 = "M69"
    M70 = "M70"
    M71 = "M71"
    M72 = "M72"
    M73 = "M73"
    M74 = "M74"
    M75 = "M75"

    # N — Administrative and support service
    N77 = "N77"
    N78 = "N78"
    N79 = "N79"
    N80 = "N80"
    N81 = "N81"
    N82 = "N82"

    # O — Public administration
    O84 = "O84"

    # P — Education
    P85 = "P85"

    # Q — Human health and social work
    Q86 = "Q86"
    Q87 = "Q87"
    Q88 = "Q88"

    # R — Arts, entertainment and recreation
    R90 = "R90"
    R91 = "R91"
    R92 = "R92"
    R93 = "R93"

    # S — Other service activities
    S94 = "S94"
    S95 = "S95"
    S96 = "S96"

    # T — Households
    T97 = "T97"
    T98 = "T98"

    # U — Extraterritorial organizations
    U99 = "U99"


class ISICDivisionName(str, Enum):
    """ISIC Rev.4 Division names."""

    A01 = "Crop and animal production, hunting and related service activities"
    A02 = "Forestry and logging"
    A03 = "Fishing and aquaculture"

    B05 = "Mining of coal and lignite"
    B06 = "Extraction of crude petroleum and natural gas"
    B07 = "Mining of metal ores"
    B08 = "Other mining and quarrying"
    B09 = "Mining support service activities"

    C10 = "Manufacture of food products"
    C11 = "Manufacture of beverages"
    C12 = "Manufacture of tobacco products"
    C13 = "Manufacture of textiles"
    C14 = "Manufacture of wearing apparel"
    C15 = "Manufacture of leather and related products"
    C16 = "Manufacture of wood and of products of wood and cork, except furniture; manufacture of articles of straw and plaiting materials"
    C17 = "Manufacture of paper and paper products"
    C18 = "Printing and reproduction of recorded media"
    C19 = "Manufacture of coke and refined petroleum products"
    C20 = "Manufacture of chemicals and chemical products"
    C21 = "Manufacture of basic pharmaceutical products and pharmaceutical preparations"
    C22 = "Manufacture of rubber and plastic products"
    C23 = "Manufacture of other non-metallic mineral products"
    C24 = "Manufacture of basic metals"
    C25 = "Manufacture of fabricated metal products, except machinery and equipment"
    C26 = "Manufacture of computer, electronic and optical products"
    C27 = "Manufacture of electrical equipment"
    C28 = "Manufacture of machinery and equipment n.e.c."
    C29 = "Manufacture of motor vehicles, trailers and semi-trailers"
    C30 = "Manufacture of other transport equipment"
    C31 = "Manufacture of furniture"
    C32 = "Other manufacturing"
    C33 = "Repair and installation of machinery and equipment"

    D35 = "Electricity, gas, steam and air conditioning supply"

    E36 = "Water collection, treatment and supply"
    E37 = "Sewerage"
    E38 = "Waste collection, treatment and disposal activities; materials recovery"
    E39 = "Remediation activities and other waste management services"

    F41 = "Construction of buildings"
    F42 = "Civil engineering"
    F43 = "Specialized construction activities"

    G45 = "Wholesale and retail trade and repair of motor vehicles and motorcycles"
    G46 = "Wholesale trade, except of motor vehicles and motorcycles"
    G47 = "Retail trade, except of motor vehicles and motorcycles"

    H49 = "Land transport and transport via pipelines"
    H50 = "Water transport"
    H51 = "Air transport"
    H52 = "Warehousing and support activities for transportation"
    H53 = "Postal and courier activities"

    I55 = "Accommodation"
    I56 = "Food and beverage service activities"

    J58 = "Publishing activities"
    J59 = "Motion picture, video and television programme production, sound recording and music publishing activities"
    J60 = "Programming and broadcasting activities"
    J61 = "Telecommunications"
    J62 = "Computer programming, consultancy and related activities"
    J63 = "Information service activities"

    K64 = "Financial service activities, except insurance and pension funding"
    K65 = "Insurance, reinsurance and pension funding, except compulsory social security"
    K66 = "Activities auxiliary to financial services and insurance activities"

    L68 = "Real estate activities"

    M69 = "Legal and accounting activities"
    M70 = "Activities of head offices; management consultancy activities"
    M71 = "Architectural and engineering activities; technical testing and analysis"
    M72 = "Scientific research and development"
    M73 = "Advertising and market research"
    M74 = "Other professional, scientific and technical activities"
    M75 = "Veterinary activities"

    N77 = "Rental and leasing activities"
    N78 = "Employment activities"
    N79 = "Travel agency, tour operator and other reservation service and related activities"
    N80 = "Security and investigation activities"
    N81 = "Services to buildings and landscape activities"
    N82 = "Office administrative, office support and other business support activities"

    O84 = "Public administration and defence; compulsory social security"

    P85 = "Education"

    Q86 = "Human health activities"
    Q87 = "Residential care activities"
    Q88 = "Social work activities without accommodation"

    R90 = "Creative, arts and entertainment activities"
    R91 = "Libraries, archives, museums and other cultural activities"
    R92 = "Gambling and betting activities"
    R93 = "Sports activities and amusement and recreation activities"

    S94 = "Activities of membership organizations"
    S95 = "Repair of computers and personal and household goods"
    S96 = "Other personal service activities"

    T97 = "Activities of households as employers of domestic personnel"
    T98 = "Undifferentiated goods- and services-producing activities of private households for own use"

    U99 = "Activities of extraterritorial organizations and bodies"

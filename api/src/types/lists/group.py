from enum import Enum


# https://unstats.un.org/unsd/classifications/Econ/
class ISICGroupCode(str, Enum):
    """ISIC Rev.4 Groups (Section + 3-digit group code)."""

    # A — Agriculture, forestry and fishing
    A011 = "A011"
    A012 = "A012"
    A013 = "A013"
    A014 = "A014"
    A015 = "A015"
    A016 = "A016"
    A017 = "A017"
    A021 = "A021"
    A022 = "A022"
    A023 = "A023"
    A024 = "A024"
    A031 = "A031"
    A032 = "A032"

    # B — Mining and quarrying
    B051 = "B051"
    B052 = "B052"
    B061 = "B061"
    B062 = "B062"
    B071 = "B071"
    B072 = "B072"
    B081 = "B081"
    B089 = "B089"
    B091 = "B091"
    B099 = "B099"

    # C — Manufacturing
    C101 = "C101"
    C102 = "C102"
    C103 = "C103"
    C104 = "C104"
    C105 = "C105"
    C106 = "C106"
    C107 = "C107"
    C108 = "C108"
    C110 = "C110"
    C120 = "C120"
    C131 = "C131"
    C132 = "C132"
    C139 = "C139"
    C141 = "C141"
    C142 = "C142"
    C143 = "C143"
    C151 = "C151"
    C152 = "C152"
    C161 = "C161"
    C162 = "C162"
    C170 = "C170"
    C181 = "C181"
    C182 = "C182"
    C191 = "C191"
    C192 = "C192"
    C201 = "C201"
    C202 = "C202"
    C203 = "C203"
    C210 = "C210"
    C221 = "C221"
    C222 = "C222"
    C231 = "C231"
    C239 = "C239"
    C241 = "C241"
    C242 = "C242"
    C243 = "C243"
    C251 = "C251"
    C252 = "C252"
    C259 = "C259"
    C261 = "C261"
    C262 = "C262"
    C263 = "C263"
    C264 = "C264"
    C265 = "C265"
    C266 = "C266"
    C267 = "C267"
    C268 = "C268"
    C271 = "C271"
    C272 = "C272"
    C273 = "C273"
    C274 = "C274"
    C275 = "C275"
    C279 = "C279"
    C281 = "C281"
    C282 = "C282"
    C289 = "C289"
    C291 = "C291"
    C292 = "C292"
    C293 = "C293"
    C301 = "C301"
    C302 = "C302"
    C303 = "C303"
    C304 = "C304"
    C309 = "C309"
    C310 = "C310"
    C321 = "C321"
    C322 = "C322"
    C323 = "C323"
    C324 = "C324"
    C325 = "C325"
    C329 = "C329"
    C331 = "C331"
    C332 = "C332"

    # D
    D351 = "D351"
    D352 = "D352"
    D353 = "D353"

    # E
    E360 = "E360"
    E370 = "E370"
    E381 = "E381"
    E382 = "E382"
    E383 = "E383"
    E390 = "E390"

    # F
    F410 = "F410"
    F421 = "F421"
    F422 = "F422"
    F429 = "F429"
    F431 = "F431"
    F432 = "F432"
    F433 = "F433"
    F439 = "F439"

    # G
    G451 = "G451"
    G452 = "G452"
    G453 = "G453"
    G454 = "G454"
    G461 = "G461"
    G462 = "G462"
    G463 = "G463"
    G464 = "G464"
    G465 = "G465"
    G466 = "G466"
    G469 = "G469"
    G471 = "G471"
    G472 = "G472"
    G473 = "G473"
    G474 = "G474"
    G475 = "G475"
    G476 = "G476"
    G477 = "G477"
    G478 = "G478"
    G479 = "G479"

    # H
    H491 = "H491"
    H492 = "H492"
    H493 = "H493"
    H501 = "H501"
    H502 = "H502"
    H511 = "H511"
    H512 = "H512"
    H521 = "H521"
    H522 = "H522"
    H531 = "H531"
    H532 = "H532"

    # I
    I551 = "I551"
    I552 = "I552"
    I559 = "I559"
    I561 = "I561"
    I562 = "I562"
    I563 = "I563"

    # J
    J581 = "J581"
    J582 = "J582"
    J591 = "J591"
    J592 = "J592"
    J601 = "J601"
    J602 = "J602"
    J611 = "J611"
    J612 = "J612"
    J613 = "J613"
    J619 = "J619"
    J620 = "J620"
    J631 = "J631"
    J639 = "J639"

    # K
    K641 = "K641"
    K642 = "K642"
    K643 = "K643"
    K649 = "K649"
    K651 = "K651"
    K652 = "K652"
    K653 = "K653"
    K661 = "K661"
    K662 = "K662"
    K663 = "K663"

    # L
    L681 = "L681"
    L682 = "L682"

    # M
    M691 = "M691"
    M692 = "M692"
    M701 = "M701"
    M702 = "M702"
    M711 = "M711"
    M712 = "M712"
    M721 = "M721"
    M722 = "M722"
    M731 = "M731"
    M732 = "M732"
    M741 = "M741"
    M742 = "M742"
    M749 = "M749"
    M750 = "M750"

    # N
    N771 = "N771"
    N772 = "N772"
    N773 = "N773"
    N774 = "N774"
    N781 = "N781"
    N782 = "N782"
    N783 = "N783"
    N791 = "N791"
    N799 = "N799"
    N801 = "N801"
    N802 = "N802"
    N803 = "N803"
    N811 = "N811"
    N812 = "N812"
    N813 = "N813"
    N821 = "N821"
    N822 = "N822"
    N823 = "N823"
    N829 = "N829"

    # O
    O841 = "O841"
    O842 = "O842"
    O843 = "O843"

    # P
    P851 = "P851"
    P852 = "P852"
    P853 = "P853"
    P854 = "P854"
    P855 = "P855"
    P856 = "P856"
    P857 = "P857"

    # Q
    Q861 = "Q861"
    Q862 = "Q862"
    Q869 = "Q869"
    Q871 = "Q871"
    Q872 = "Q872"
    Q873 = "Q873"
    Q879 = "Q879"
    Q881 = "Q881"
    Q889 = "Q889"

    # R
    R900 = "R900"
    R910 = "R910"
    R920 = "R920"
    R931 = "R931"
    R932 = "R932"

    # S
    S941 = "S941"
    S942 = "S942"
    S949 = "S949"
    S951 = "S951"
    S952 = "S952"
    S960 = "S960"

    # T
    T970 = "T970"
    T981 = "T981"
    T982 = "T982"

    # U
    U990 = "U990"


class ISICGroupName(str, Enum):
    """ISIC Rev.4 Group names (3-digit level)."""

    # A — Agriculture, forestry and fishing
    A011 = "Growing of non-perennial crops"
    A012 = "Growing of perennial crops"
    A013 = "Plant propagation"
    A014 = "Animal production"
    A015 = "Mixed farming"
    A016 = "Support activities to agriculture and post-harvest crop activities"
    A017 = "Hunting, trapping and related service activities"
    A021 = "Silviculture and other forestry activities"
    A022 = "Logging"
    A023 = "Gathering of non-wood forest products"
    A024 = "Support services to forestry"
    A031 = "Fishing"
    A032 = "Aquaculture"

    # B — Mining and quarrying
    B051 = "Mining of hard coal"
    B052 = "Mining of lignite"
    B061 = "Extraction of crude petroleum"
    B062 = "Extraction of natural gas"
    B071 = "Mining of iron ores"
    B072 = "Mining of non-ferrous metal ores"
    B081 = "Quarrying of stone, sand and clay"
    B089 = "Mining and quarrying n.e.c."
    B091 = "Support activities for petroleum and natural gas extraction"
    B099 = "Support activities for other mining and quarrying"

    # C — Manufacturing
    C101 = "Processing and preserving of meat"
    C102 = "Processing and preserving of fish, crustaceans and molluscs"
    C103 = "Processing and preserving of fruit and vegetables"
    C104 = "Manufacture of vegetable and animal oils and fats"
    C105 = "Manufacture of dairy products"
    C106 = "Manufacture of grain mill products, starches and starch products"
    C107 = "Manufacture of other food products"
    C108 = "Manufacture of prepared animal feeds"
    C110 = "Manufacture of beverages"
    C120 = "Manufacture of tobacco products"
    C131 = "Spinning, weaving and finishing of textiles"
    C132 = "Manufacture of other textiles"
    C139 = "Manufacture of knitted and crocheted fabrics"
    C141 = "Manufacture of wearing apparel, except fur apparel"
    C142 = "Manufacture of articles of fur"
    C143 = "Manufacture of knitted and crocheted apparel"
    C151 = "Tanning and dressing of leather; manufacture of luggage, handbags, saddlery and harness"
    C152 = "Manufacture of footwear"
    C161 = "Sawmilling and planing of wood"
    C162 = "Manufacture of products of wood, cork, straw and plaiting materials"
    C170 = "Manufacture of paper and paper products"
    C181 = "Printing and service activities related to printing"
    C182 = "Reproduction of recorded media"
    C191 = "Manufacture of coke oven products"
    C192 = "Manufacture of refined petroleum products"
    C201 = "Manufacture of basic chemicals, fertilizers and nitrogen compounds, plastics and synthetic rubber in primary forms"
    C202 = "Manufacture of other chemical products"
    C203 = "Manufacture of man-made fibres"
    C210 = "Manufacture of pharmaceuticals, medicinal chemical and botanical products"
    C221 = "Manufacture of rubber products"
    C222 = "Manufacture of plastic products"
    C231 = "Manufacture of glass and glass products"
    C239 = "Manufacture of non-metallic mineral products n.e.c."
    C241 = "Manufacture of basic iron and steel"
    C242 = "Manufacture of basic precious and other non-ferrous metals"
    C243 = "Casting of metals"
    C251 = "Manufacture of structural metal products, tanks, reservoirs and steam generators"
    C252 = "Manufacture of weapons and ammunition"
    C259 = "Manufacture of other fabricated metal products; metalworking service activities"
    C261 = "Manufacture of electronic components and boards"
    C262 = "Manufacture of computers and peripheral equipment"
    C263 = "Manufacture of communication equipment"
    C264 = "Manufacture of consumer electronics"
    C265 = "Manufacture of measuring, testing, navigating and control equipment; watches and clocks"
    C266 = "Manufacture of irradiation, electromedical and electrotherapeutic equipment"
    C267 = "Manufacture of optical instruments and photographic equipment"
    C268 = "Manufacture of magnetic and optical media"
    C271 = "Manufacture of electric motors, generators, transformers and electricity distribution and control apparatus"
    C272 = "Manufacture of batteries and accumulators"
    C273 = "Manufacture of wiring and wiring devices"
    C274 = "Manufacture of electric lighting equipment"
    C275 = "Manufacture of domestic appliances"
    C279 = "Manufacture of other electrical equipment"
    C281 = "Manufacture of general-purpose machinery"
    C282 = "Manufacture of special-purpose machinery"
    C289 = "Manufacture of other machinery and equipment n.e.c."
    C291 = "Manufacture of motor vehicles"
    C292 = "Manufacture of bodies (coachwork) for motor vehicles; manufacture of trailers and semi-trailers"
    C293 = "Manufacture of parts and accessories for motor vehicles"
    C301 = "Building of ships and boats"
    C302 = "Manufacture of railway locomotives and rolling stock"
    C303 = "Manufacture of air and spacecraft and related machinery"
    C304 = "Manufacture of military fighting vehicles"
    C309 = "Manufacture of transport equipment n.e.c."
    C310 = "Manufacture of furniture"
    C321 = "Manufacture of jewellery, bijouterie and related articles"
    C322 = "Manufacture of musical instruments"
    C323 = "Manufacture of sports goods"
    C324 = "Manufacture of games and toys"
    C325 = "Manufacture of medical and dental instruments and supplies"
    C329 = "Other manufacturing n.e.c."
    C331 = "Repair of fabricated metal products, machinery and equipment"
    C332 = "Installation of industrial machinery and equipment"

    # D — Electricity, gas, steam and air conditioning supply
    D351 = "Electric power generation, transmission and distribution"
    D352 = "Manufacture of gas; distribution of gaseous fuels through mains"
    D353 = "Steam and air conditioning supply"

    # E — Water supply; sewerage, waste management and remediation
    E360 = "Water collection, treatment and supply"
    E370 = "Sewerage"
    E381 = "Waste collection"
    E382 = "Waste treatment and disposal"
    E383 = "Materials recovery"
    E390 = "Remediation activities and other waste management services"

    # F — Construction
    F410 = "Construction of buildings"
    F421 = "Construction of roads and railways"
    F422 = "Construction of utility projects"
    F429 = "Construction of other civil engineering projects"
    F431 = "Demolition and site preparation"
    F432 = "Electrical, plumbing and other construction installation activities"
    F433 = "Building completion and finishing"
    F439 = "Other specialized construction activities"

    # G — Wholesale and retail trade; repair of motor vehicles
    G451 = "Sale of motor vehicles"
    G452 = "Maintenance and repair of motor vehicles"
    G453 = "Sale of motor vehicle parts and accessories"
    G454 = "Sale, maintenance and repair of motorcycles and related parts and accessories"
    G461 = "Wholesale on a fee or contract basis"
    G462 = "Wholesale of agricultural raw materials and live animals"
    G463 = "Wholesale of food, beverages and tobacco"
    G464 = "Wholesale of household goods"
    G465 = "Wholesale of machinery, equipment and supplies"
    G466 = "Other specialized wholesale"
    G469 = "Non-specialized wholesale trade"
    G471 = "Retail sale in non-specialized stores"
    G472 = "Retail sale of food, beverages and tobacco in specialized stores"
    G473 = "Retail sale of automotive fuel in specialized stores"
    G474 = "Retail sale of information and communications equipment in specialized stores"
    G475 = "Retail sale of other household equipment in specialized stores"
    G476 = "Retail sale of cultural and recreation goods in specialized stores"
    G477 = "Retail sale of other goods in specialized stores"
    G478 = "Retail sale via stalls and markets"
    G479 = "Retail trade not in stores, stalls or markets"

    # H — Transportation and storage
    H491 = "Passenger rail transport, interurban"
    H492 = "Freight rail transport"
    H493 = "Other land transport"
    H501 = "Sea and coastal passenger water transport"
    H502 = "Sea and coastal freight water transport"
    H511 = "Passenger air transport"
    H512 = "Freight air transport"
    H521 = "Warehousing and storage"
    H522 = "Support activities for transportation"
    H531 = "Postal activities under universal service obligation"
    H532 = "Other postal and courier activities"

    # I — Accommodation and food service activities
    I551 = "Short term accommodation activities"
    I552 = "Camping grounds, recreational vehicle parks and trailer parks"
    I559 = "Other accommodation"
    I561 = "Restaurants and mobile food service activities"
    I562 = "Event catering and other food service activities"
    I563 = "Beverage serving activities"

    # J — Information and communication
    J581 = "Publishing of books, periodicals and other publishing activities"
    J582 = "Software publishing"
    J591 = "Motion picture, video and television programme activities"
    J592 = "Sound recording and music publishing activities"
    J601 = "Radio broadcasting"
    J602 = "Television programming and broadcasting activities"
    J611 = "Wired telecommunications activities"
    J612 = "Wireless telecommunications activities"
    J613 = "Satellite telecommunications activities"
    J619 = "Other telecommunications activities"
    J620 = "Computer programming, consultancy and related activities"
    J631 = "Data processing, hosting and related activities; web portals"
    J639 = "Other information service activities"

    # K — Financial and insurance activities
    K641 = "Monetary intermediation"
    K642 = "Activities of holding companies"
    K643 = "Trusts, funds and similar financial entities"
    K649 = "Other financial service activities, except insurance and pension funding"
    K651 = "Insurance"
    K652 = "Reinsurance"
    K653 = "Pension funding"
    K661 = "Activities auxiliary to financial services, except insurance and pension funding"
    K662 = "Activities auxiliary to insurance and pension funding"
    K663 = "Fund management activities"

    # L — Real estate activities
    L681 = "Buying and selling of own real estate"
    L682 = "Real estate activities on a fee or contract basis"

    # M — Professional, scientific and technical activities
    M691 = "Legal activities"
    M692 = "Accounting, bookkeeping and auditing activities; tax consultancy"
    M701 = "Activities of head offices"
    M702 = "Management consultancy activities"
    M711 = "Architectural and engineering activities and related technical consultancy"
    M712 = "Technical testing and analysis"
    M721 = "Research and experimental development on natural sciences and engineering"
    M722 = "Research and experimental development on social sciences and humanities"
    M731 = "Advertising"
    M732 = "Market research and public opinion polling"
    M741 = "Specialized design activities"
    M742 = "Photographic activities"
    M749 = "Other professional, scientific and technical activities n.e.c."
    M750 = "Veterinary activities"

    # N — Administrative and support service activities
    N771 = "Renting and leasing of motor vehicles"
    N772 = "Renting and leasing of personal and household goods"
    N773 = "Renting and leasing of other machinery, equipment and tangible goods"
    N774 = "Leasing of intellectual property and similar products, except copyrighted works"
    N781 = "Activities of employment placement agencies"
    N782 = "Temporary employment agency activities"
    N783 = "Other human resources provision"
    N791 = "Travel agency and tour operator activities"
    N799 = "Other reservation service and related activities"
    N801 = "Private security activities"
    N802 = "Security systems service activities"
    N803 = "Investigation activities"
    N811 = "Combined facilities support activities"
    N812 = "Cleaning activities"
    N813 = "Landscape service activities"
    N821 = "Office administrative and support activities"
    N822 = "Activities of call centres"
    N823 = "Organization of conventions and trade shows"
    N829 = "Business support service activities n.e.c."

    # O — Public administration and defence
    O841 = "Administration of the State and the economic and social policy of the community"
    O842 = "Provision of services to the community as a whole"
    O843 = "Compulsory social security activities"

    # P — Education
    P851 = "Pre-primary and primary education"
    P852 = "Secondary education"
    P853 = "Higher education"
    P854 = "Other education"
    P855 = "Educational support activities"
    P856 = "Educational support activities (non-formal)"  # rare subdivision in practice
    P857 = "Other education n.e.c."  # used in some national mappings

    # Q — Human health and social work activities
    Q861 = "Hospital activities"
    Q862 = "Medical and dental practice activities"
    Q869 = "Other human health activities"
    Q871 = "Residential nursing care activities"
    Q872 = "Residential care activities for mental retardation, mental health and substance abuse"
    Q873 = "Residential care activities for the elderly and disabled"
    Q879 = "Other residential care activities"
    Q881 = "Social work activities without accommodation for the elderly and disabled"
    Q889 = "Other social work activities without accommodation"

    # R — Arts, entertainment and recreation
    R900 = "Creative, arts and entertainment activities"
    R910 = "Libraries, archives, museums and other cultural activities"
    R920 = "Gambling and betting activities"
    R931 = "Sports activities"
    R932 = "Other amusement and recreation activities"

    # S — Other service activities
    S941 = "Activities of business, employers and professional membership organizations"
    S942 = "Activities of trade unions"
    S949 = "Activities of other membership organizations"
    S951 = "Repair of computers and communication equipment"
    S952 = "Repair of personal and household goods"
    S960 = "Other personal service activities"

    # T — Households
    T970 = "Activities of households as employers of domestic personnel"
    T981 = "Undifferentiated goods-producing activities of private households for own use"
    T982 = "Undifferentiated service-producing activities of private households for own use"

    # U — Extraterritorial organizations
    U990 = "Activities of extraterritorial organizations and bodies"



class ISICClassName(str, Enum):
    """ISIC Rev.4 Class names (4-digit level)."""

    # A — Agriculture, forestry and fishing

    A0111 = "Growing of cereals (except rice), leguminous crops and oil seeds"
    A0112 = "Growing of rice"
    A0113 = "Growing of vegetables and melons, roots and tubers"
    A0114 = "Growing of sugar cane"
    A0115 = "Growing of tobacco"
    A0116 = "Growing of fibre crops"
    A0119 = "Growing of other non-perennial crops"

    A0121 = "Growing of grapes"
    A0122 = "Growing of tropical and subtropical fruits"
    A0123 = "Growing of citrus fruits"
    A0124 = "Growing of pome fruits and stone fruits"
    A0125 = "Growing of other tree and bush fruits and nuts"
    A0126 = "Growing of oleaginous fruits"
    A0127 = "Growing of beverage crops"
    A0128 = "Growing of spices, aromatic, drug and pharmaceutical crops"
    A0129 = "Growing of other perennial crops"

    A0130 = "Plant propagation"

    A0141 = "Raising of cattle and buffaloes"
    A0142 = "Raising of horses and other equines"
    A0143 = "Raising of camels and camelids"
    A0144 = "Raising of sheep and goats"
    A0145 = "Raising of swine/pigs"
    A0146 = "Raising of poultry"
    A0149 = "Raising of other animals"

    A0150 = "Mixed farming"

    A0161 = "Support activities for crop production"
    A0162 = "Support activities for animal production"
    A0163 = "Post-harvest crop activities"
    A0164 = "Seed processing for propagation"

    A0170 = "Hunting, trapping and related service activities"

    A0210 = "Silviculture and other forestry activities"
    A0220 = "Logging"
    A0230 = "Gathering of non-wood forest products"
    A0240 = "Support services to forestry"

    A0311 = "Marine fishing"
    A0312 = "Freshwater fishing"
    A0321 = "Marine aquaculture"
    A0322 = "Freshwater aquaculture"

    # B — Mining and quarrying

    B0510 = "Mining of hard coal"
    B0520 = "Mining of lignite"

    B0610 = "Extraction of crude petroleum"
    B0620 = "Extraction of natural gas"

    B0710 = "Mining of iron ores"
    B0721 = "Mining of uranium and thorium ores"
    B0729 = "Mining of other non-ferrous metal ores"

    B0810 = "Quarrying of stone, sand and clay"

    B0891 = "Mining of chemical and fertilizer minerals"
    B0892 = "Extraction of peat"
    B0893 = "Extraction of salt"
    B0899 = "Other mining and quarrying n.e.c."

    B0910 = "Support activities for petroleum and natural gas extraction"
    B0990 = "Support activities for other mining and quarrying"

    # C — Manufacturing

    C1010 = "Processing and preserving of meat"
    C1020 = "Processing and preserving of fish, crustaceans and molluscs"
    C1030 = "Processing and preserving of fruit and vegetables"
    C1040 = "Manufacture of vegetable and animal oils and fats"
    C1050 = "Manufacture of dairy products"
    C1061 = "Manufacture of grain mill products"
    C1062 = "Manufacture of starches and starch products"
    C1071 = "Manufacture of bakery products"
    C1072 = "Manufacture of sugar"
    C1073 = "Manufacture of cocoa, chocolate and sugar confectionery"
    C1074 = "Manufacture of macaroni, noodles, couscous and similar farinaceous products"
    C1075 = "Manufacture of prepared meals and dishes"
    C1079 = "Manufacture of other food products n.e.c."
    C1080 = "Manufacture of prepared animal feeds"

    C1101 = "Distilling, rectifying and blending of spirits"
    C1102 = "Manufacture of wines"
    C1103 = "Manufacture of malt liquors and malt"
    C1104 = "Manufacture of soft drinks; production of mineral waters and other bottled waters"
    C1105 = "Manufacture of beer"
    C1106 = "Manufacture of other non-distilled fermented beverages"

    C1200 = "Manufacture of tobacco products"

    C1311 = "Preparation and spinning of textile fibres"
    C1312 = "Weaving of textiles"
    C1313 = "Finishing of textiles"

    C1391 = "Manufacture of knitted and crocheted fabrics"
    C1392 = "Manufacture of made-up textile articles, except apparel"
    C1393 = "Manufacture of carpets and rugs"
    C1394 = "Manufacture of cordage, rope, twine and netting"
    C1399 = "Manufacture of other textiles n.e.c."

    C1410 = "Manufacture of wearing apparel, except fur apparel"
    C1420 = "Manufacture of articles of fur"
    C1430 = "Manufacture of knitted and crocheted apparel"

    C1511 = "Tanning and dressing of leather; dressing and dyeing of fur"
    C1512 = "Manufacture of luggage, handbags and the like, saddlery and harness"
    C1520 = "Manufacture of footwear"

    C1610 = "Sawmilling and planing of wood"
    C1621 = "Manufacture of veneer sheets and wood-based panels"
    C1622 = "Manufacture of builders' carpentry and joinery"
    C1623 = "Manufacture of wooden containers"
    C1629 = "Manufacture of other products of wood; manufacture of articles of cork, straw and plaiting materials"

    C1701 = "Manufacture of pulp, paper and paperboard"
    C1702 = "Manufacture of corrugated paper and paperboard and of containers of paper and paperboard"

    C1811 = "Printing"
    C1812 = "Service activities related to printing"
    C1820 = "Reproduction of recorded media"

    C1910 = "Manufacture of coke oven products"
    C1920 = "Manufacture of refined petroleum products"

    C2011 = "Manufacture of basic chemicals"
    C2012 = "Manufacture of fertilizers and nitrogen compounds"
    C2013 = "Manufacture of plastics and synthetic rubber in primary forms"
    C2014 = "Manufacture of other organic basic chemicals"
    C2015 = "Manufacture of industrial gases"
    C2016 = "Manufacture of dyes and pigments"
    C2017 = "Manufacture of synthetic rubber in primary forms"

    C2021 = "Manufacture of pesticides and other agrochemical products"
    C2022 = "Manufacture of paints, varnishes and similar coatings, printing ink and mastics"
    C2023 = "Manufacture of soap and detergents, cleaning and polishing preparations, perfumes and toilet preparations"
    C2029 = "Manufacture of other chemical products n.e.c."

    C2030 = "Manufacture of man-made fibres"

    C2100 = "Manufacture of basic pharmaceutical products and pharmaceutical preparations"

    C2211 = "Manufacture of rubber tyres and tubes; retreading and rebuilding of rubber tyres"
    C2219 = "Manufacture of other rubber products"
    C2220 = "Manufacture of plastic products"

    C2310 = "Manufacture of glass and glass products"

    C2391 = "Manufacture of refractory products"
    C2392 = "Manufacture of clay building materials"
    C2393 = "Manufacture of other porcelain and ceramic products"
    C2394 = "Manufacture of cement, lime and plaster"
    C2395 = "Manufacture of articles of concrete, cement and plaster"
    C2396 = "Cutting, shaping and finishing of stone"
    C2399 = "Manufacture of other non-metallic mineral products n.e.c."

    C2410 = "Manufacture of basic iron and steel"
    C2420 = "Manufacture of basic precious and other non-ferrous metals"
    C2431 = "Casting of iron and steel"
    C2432 = "Casting of non-ferrous metals"

    C2511 = "Manufacture of structural metal products"
    C2512 = "Manufacture of tanks, reservoirs and containers of metal"
    C2513 = "Manufacture of steam generators, except central heating hot water boilers"
    C2520 = "Manufacture of weapons and ammunition"

    C2591 = "Forging, pressing, stamping and roll-forming of metal; powder metallurgy"
    C2592 = "Treatment and coating of metals; machining"
    C2593 = "Manufacture of cutlery, hand tools and general hardware"
    C2599 = "Manufacture of other fabricated metal products n.e.c."

    C2610 = "Manufacture of electronic components and boards"
    C2620 = "Manufacture of computers and peripheral equipment"
    C2630 = "Manufacture of communication equipment"
    C2640 = "Manufacture of consumer electronics"
    C2651 = "Manufacture of measuring, testing, navigating and control equipment"
    C2652 = "Manufacture of watches and clocks"
    C2660 = "Manufacture of irradiation, electromedical and electrotherapeutic equipment"
    C2670 = "Manufacture of optical instruments and photographic equipment"
    C2680 = "Manufacture of magnetic and optical media"

    C2710 = "Manufacture of electric motors, generators, transformers and electricity distribution and control apparatus"
    C2720 = "Manufacture of batteries and accumulators"
    C2731 = "Manufacture of fibre optic cables"
    C2732 = "Manufacture of other electronic and electric wires and cables"
    C2733 = "Manufacture of wiring devices"
    C2740 = "Manufacture of electric lighting equipment"
    C2750 = "Manufacture of domestic appliances"
    C2790 = "Manufacture of other electrical equipment"

    C2811 = "Manufacture of engines and turbines, except aircraft, vehicle and cycle engines"
    C2812 = "Manufacture of fluid power equipment"
    C2813 = "Manufacture of other pumps, compressors, taps and valves"
    C2814 = "Manufacture of bearings, gears, gearing and driving elements"
    C2815 = "Manufacture of ovens, furnaces and furnace burners"
    C2816 = "Manufacture of lifting and handling equipment"
    C2817 = "Manufacture of office machinery and equipment (except computers and peripheral equipment)"
    C2818 = "Manufacture of power-driven hand tools"
    C2819 = "Manufacture of other general-purpose machinery n.e.c."

    C2821 = "Manufacture of agricultural and forestry machinery"
    C2822 = "Manufacture of metal-forming machinery and machine tools"
    C2823 = "Manufacture of machinery for metallurgy"
    C2824 = "Manufacture of machinery for mining, quarrying and construction"
    C2825 = "Manufacture of machinery for food, beverage and tobacco processing"
    C2826 = "Manufacture of machinery for textile, apparel and leather production"
    C2829 = "Manufacture of other special-purpose machinery n.e.c."

    C2891 = "Manufacture of machinery for paper and paperboard production"
    C2892 = "Manufacture of machinery for plastics and rubber industries"
    C2893 = "Manufacture of machinery for working rubber or plastics"
    C2899 = "Manufacture of other machinery and equipment n.e.c."

    C2910 = "Manufacture of motor vehicles"
    C2920 = "Manufacture of bodies (coachwork) for motor vehicles; manufacture of trailers and semi-trailers"
    C2930 = "Manufacture of parts and accessories for motor vehicles"

    C3011 = "Building of ships and floating structures"
    C3012 = "Building of pleasure and sporting boats"
    C3020 = "Manufacture of railway locomotives and rolling stock"
    C3030 = "Manufacture of air and spacecraft and related machinery"
    C3040 = "Manufacture of military fighting vehicles"
    C3091 = "Manufacture of motorcycles"
    C3092 = "Manufacture of bicycles and invalid carriages"
    C3099 = "Manufacture of other transport equipment n.e.c."

    C3100 = "Manufacture of furniture"

    C3211 = "Striking of coins"
    C3212 = "Manufacture of jewellery and related articles"
    C3220 = "Manufacture of musical instruments"
    C3230 = "Manufacture of sports goods"
    C3240 = "Manufacture of games and toys"
    C3250 = "Manufacture of medical and dental instruments and supplies"
    C3290 = "Other manufacturing n.e.c."

    C3311 = "Repair of fabricated metal products"
    C3312 = "Repair of machinery"
    C3313 = "Repair of electronic and optical equipment"
    C3314 = "Repair of electrical equipment"
    C3315 = "Repair of transport equipment, except motor vehicles"
    C3319 = "Repair of other equipment"
    C3320 = "Installation of industrial machinery and equipment"

    # D — Electricity, gas, steam and air conditioning supply

    D3510 = "Electric power generation, transmission and distribution"
    D3520 = "Manufacture of gas; distribution of gaseous fuels through mains"
    D3530 = "Steam and air conditioning supply"

    # E — Water supply; sewerage, waste management and remediation activities

    E3600 = "Water collection, treatment and supply"
    E3700 = "Sewerage"

    E3811 = "Collection of non-hazardous waste"
    E3812 = "Collection of hazardous waste"

    E3821 = "Treatment and disposal of non-hazardous waste"
    E3822 = "Treatment and disposal of hazardous waste"

    E3830 = "Materials recovery"
    E3900 = "Remediation activities and other waste management services"

    # F — Construction

    F4100 = "Construction of buildings"

    F4210 = "Construction of roads and railways"
    F4220 = "Construction of utility projects"
    F4290 = "Construction of other civil engineering projects"

    F4311 = "Demolition"
    F4312 = "Site preparation"

    F4321 = "Electrical installation"
    F4322 = "Plumbing, heat and air-conditioning installation"
    F4329 = "Other construction installation"

    F4330 = "Building completion and finishing"
    F4390 = "Other specialized construction activities"

    # G — Wholesale and retail trade; repair of motor vehicles and motorcycles

    G4510 = "Sale of motor vehicles"
    G4520 = "Maintenance and repair of motor vehicles"
    G4530 = "Sale of motor vehicle parts and accessories"
    G4540 = "Sale, maintenance and repair of motorcycles and related parts and accessories"

    G4610 = "Wholesale on a fee or contract basis"
    G4620 = "Wholesale of agricultural raw materials and live animals"
    G4630 = "Wholesale of food, beverages and tobacco"

    G4641 = "Wholesale of textiles, clothing and footwear"
    G4649 = "Wholesale of other household goods"

    G4651 = "Wholesale of computers, computer peripheral equipment and software"
    G4652 = "Wholesale of electronic and telecommunications equipment and parts"
    G4653 = "Wholesale of agricultural machinery, equipment and supplies"
    G4659 = "Wholesale of other machinery and equipment"

    G4661 = "Wholesale of solid, liquid and gaseous fuels and related products"
    G4662 = "Wholesale of metals and metal ores"
    G4663 = "Wholesale of construction materials, hardware, plumbing and heating equipment and supplies"
    G4669 = "Wholesale of waste and scrap and other products n.e.c."

    G4690 = "Non-specialized wholesale trade"

    G4711 = "Retail sale in non-specialized stores with food, beverages or tobacco predominating"
    G4719 = "Other retail sale in non-specialized stores"

    G4721 = "Retail sale of food in specialized stores"
    G4722 = "Retail sale of beverages in specialized stores"
    G4723 = "Retail sale of tobacco products in specialized stores"
    G4724 = "Retail sale of bread, cakes, flour confectionery and sugar confectionery in specialized stores"
    G4729 = "Other retail sale of food in specialized stores"

    G4730 = "Retail sale of automotive fuel in specialized stores"

    G4741 = "Retail sale of computers, peripheral units, software and telecommunications equipment in specialized stores"
    G4742 = "Retail sale of audio and video equipment in specialized stores"

    G4751 = "Retail sale of textiles in specialized stores"
    G4752 = "Retail sale of hardware, paints and glass in specialized stores"
    G4753 = "Retail sale of carpets, rugs, wall and floor coverings in specialized stores"
    G4759 = "Retail sale of electrical household appliances, furniture, lighting equipment and other household articles in specialized stores"

    G4761 = "Retail sale of books, newspapers and stationery in specialized stores"
    G4762 = "Retail sale of music and video recordings in specialized stores"
    G4763 = "Retail sale of sporting equipment in specialized stores"
    G4764 = "Retail sale of games and toys in specialized stores"
    G4769 = "Retail sale of other cultural and recreation goods in specialized stores"

    G4771 = "Retail sale of clothing, footwear and leather articles in specialized stores"
    G4772 = "Retail sale of pharmaceutical and medical goods, cosmetic and toilet articles in specialized stores"
    G4773 = "Other retail sale of new goods in specialized stores"
    G4774 = "Retail sale of watches and jewellery in specialized stores"
    G4775 = "Retail sale of second-hand goods in stores"
    G4778 = "Other retail sale of new goods in specialized stores n.e.c."
    G4779 = "Retail sale of other goods in specialized stores n.e.c."

    G4781 = "Retail sale via stalls and markets of food, beverages and tobacco products"
    G4782 = "Retail sale via stalls and markets of textiles, clothing and footwear"
    G4789 = "Retail sale via stalls and markets of other goods"

    G4791 = "Retail sale via mail order houses or via Internet"
    G4799 = "Other retail sale not in stores, stalls or markets"

    # H — Transportation and storage

    H4911 = "Passenger rail transport, interurban"
    H4912 = "Freight rail transport"

    H4921 = "Urban and suburban passenger land transport"
    H4922 = "Other passenger land transport"
    H4923 = "Freight transport by road"

    H4930 = "Transport via pipeline"

    H5011 = "Sea and coastal passenger water transport"
    H5012 = "Inland passenger water transport"

    H5021 = "Sea and coastal freight water transport"
    H5022 = "Inland freight water transport"

    H5110 = "Passenger air transport"
    H5120 = "Freight air transport"

    H5210 = "Warehousing and storage"

    H5221 = "Service activities incidental to land transportation"
    H5222 = "Service activities incidental to water transportation"
    H5223 = "Service activities incidental to air transportation"
    H5224 = "Cargo handling"
    H5229 = "Other transportation support activities"

    H5310 = "Postal activities under universal service obligation"
    H5320 = "Other postal and courier activities"

    # I — Accommodation and food service activities

    I5510 = "Short term accommodation activities"
    I5520 = "Camping grounds, recreational vehicle parks and trailer parks"
    I5590 = "Other accommodation"

    I5610 = "Restaurants and mobile food service activities"
    I5621 = "Event catering activities"
    I5629 = "Other food service activities"
    I5630 = "Beverage serving activities"

    # J — Information and communication

    J5811 = "Book publishing"
    J5812 = "Publishing of directories and mailing lists"
    J5813 = "Publishing of newspapers, journals and periodicals"
    J5819 = "Other publishing activities"

    J5820 = "Software publishing"

    J5911 = "Motion picture, video and television programme production activities"
    J5912 = "Motion picture, video and television programme post-production activities"
    J5913 = "Motion picture, video and television programme distribution activities"
    J5914 = "Motion picture projection activities"

    J5920 = "Sound recording and music publishing activities"

    J6010 = "Radio broadcasting"
    J6020 = "Television programming and broadcasting activities"

    J6110 = "Wired telecommunications activities"
    J6120 = "Wireless telecommunications activities"
    J6130 = "Satellite telecommunications activities"
    J6190 = "Other telecommunications activities"

    J6201 = "Computer programming activities"
    J6202 = "Computer consultancy and computer facilities management activities"
    J6209 = "Other information technology and computer service activities"

    J6311 = "Data processing, hosting and related activities"
    J6312 = "Web portals"

    J6391 = "News agency activities"
    J6399 = "Other information service activities n.e.c."

    # K — Financial and insurance activities

    K6411 = "Central banking"
    K6419 = "Other monetary intermediation"

    K6420 = "Activities of holding companies"
    K6430 = "Trusts, funds and similar financial entities"

    K6491 = "Financial leasing"
    K6492 = "Other credit granting"
    K6499 = "Other financial service activities, except insurance and pension funding n.e.c."

    K6511 = "Life insurance"
    K6512 = "Non-life insurance"

    K6520 = "Reinsurance"
    K6530 = "Pension funding"

    K6611 = "Administration of financial markets"
    K6612 = "Security and commodity contracts brokerage"
    K6619 = "Other activities auxiliary to financial services, except insurance and pension funding"

    K6621 = "Risk and damage evaluation"
    K6622 = "Activities of insurance agents and brokers"
    K6629 = "Other activities auxiliary to insurance and pension funding"

    K6630 = "Fund management activities"

    # L — Real estate activities

    L6810 = "Buying and selling of own real estate"
    L6820 = "Real estate activities on a fee or contract basis"

    # M — Professional, scientific and technical activities

    M6910 = "Legal activities"
    M6920 = "Accounting, bookkeeping and auditing activities; tax consultancy"

    M7010 = "Activities of head offices"
    M7020 = "Management consultancy activities"

    M7110 = "Architectural and engineering activities and related technical consultancy"
    M7120 = "Technical testing and analysis"

    M7210 = "Research and experimental development on natural sciences and engineering"
    M7220 = "Research and experimental development on social sciences and humanities"

    M7310 = "Advertising"
    M7320 = "Market research and public opinion polling"

    M7410 = "Specialized design activities"
    M7420 = "Photographic activities"
    M7490 = "Other professional, scientific and technical activities n.e.c."

    M7500 = "Veterinary activities"

    # N — Administrative and support service activities

    N7710 = "Renting and leasing of motor vehicles"

    N7721 = "Renting and leasing of recreational and sports goods"
    N7722 = "Renting of video tapes and disks"
    N7729 = "Renting and leasing of other personal and household goods"

    N7730 = "Renting and leasing of other machinery, equipment and tangible goods"
    N7740 = "Leasing of intellectual property and similar products, except copyrighted works"

    N7810 = "Activities of employment placement agencies"
    N7820 = "Temporary employment agency activities"
    N7830 = "Other human resources provision"

    N7911 = "Travel agency activities"
    N7912 = "Tour operator activities"
    N7990 = "Other reservation service and related activities"

    N8010 = "Private security activities"
    N8020 = "Security systems service activities"
    N8030 = "Investigation activities"

    N8110 = "Combined facilities support activities"
    N8121 = "General cleaning of buildings"
    N8129 = "Other building and industrial cleaning activities"
    N8130 = "Landscape service activities"

    N8211 = "Combined office administrative service activities"
    N8219 = "Photocopying, document preparation and other specialized office support activities"
    N8220 = "Activities of call centres"
    N8230 = "Organization of conventions and trade shows"

    N8291 = "Activities of collection agencies and credit bureaus"
    N8292 = "Packaging activities"
    N8299 = "Other business support service activities n.e.c."

    # O — Public administration and defence; compulsory social security

    O8411 = "General public administration activities"
    O8412 = "Regulation of the activities of providing health care, education, cultural services and other social services, excluding social security"
    O8413 = "Regulation of and contribution to more efficient operation of businesses"

    O8421 = "Foreign affairs"
    O8422 = "Defence activities"
    O8423 = "Public order and safety activities"

    O8430 = "Compulsory social security activities"

    # P — Education

    P8510 = "Pre-primary and primary education"

    P8521 = "General secondary education"
    P8522 = "Technical and vocational secondary education"

    P8530 = "Higher education"

    P8541 = "Sports and recreation education"
    P8542 = "Cultural education"
    P8549 = "Other education n.e.c."

    P8550 = "Educational support activities"
    P8560 = "Educational support services n.e.c."

    # Q — Human health and social work activities

    Q8610 = "Hospital activities"
    Q8620 = "Medical and dental practice activities"
    Q8690 = "Other human health activities"

    Q8710 = "Residential nursing care activities"
    Q8720 = "Residential care activities for mental retardation, mental health and substance abuse"
    Q8730 = "Residential care activities for the elderly and disabled"
    Q8790 = "Other residential care activities"

    Q8810 = "Social work activities without accommodation for the elderly and disabled"
    Q8890 = "Other social work activities without accommodation"

    # R — Arts, entertainment and recreation

    R9000 = "Creative, arts and entertainment activities"

    R9101 = "Library and archives activities"
    R9102 = "Museums activities and operation of historical sites and buildings"

    R9200 = "Gambling and betting activities"

    R9311 = "Operation of sports facilities"
    R9312 = "Activities of sports clubs"
    R9319 = "Other sports activities"

    R9321 = "Activities of amusement parks and theme parks"
    R9329 = "Other amusement and recreation activities n.e.c."

    # S — Other service activities

    S9411 = "Activities of business and employers membership organizations"
    S9412 = "Activities of professional membership organizations"
    S9420 = "Activities of trade unions"

    S9491 = "Activities of religious organizations"
    S9492 = "Activities of political organizations"
    S9499 = "Activities of other membership organizations n.e.c."

    S9511 = "Repair of computers and peripheral equipment"
    S9512 = "Repair of communication equipment"

    S9521 = "Repair of consumer electronics"
    S9522 = "Repair of household appliances and home and garden equipment"
    S9523 = "Repair of footwear and leather goods"
    S9524 = "Repair of furniture and home furnishings"
    S9529 = "Repair of other personal and household goods"

    S9601 = "Washing and (dry-)cleaning of textile and fur products"
    S9602 = "Hairdressing and other beauty treatment"
    S9603 = "Funeral and related activities"
    S9609 = "Other personal service activities n.e.c."

    # T — Activities of households as employers; undifferentiated goods- and services-producing activities of households for own use

    T9700 = "Activities of households as employers of domestic personnel"
    T9810 = "Undifferentiated goods-producing activities of private households for own use"
    T9820 = "Undifferentiated service-producing activities of private households for own use"

    # U — Activities of extraterritorial organizations and bodies

    U9900 = "Activities of extraterritorial organizations and bodies"

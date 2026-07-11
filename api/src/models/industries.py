from enum import StrEnum


# https://unstats.un.org/unsd/classifications/Econ/
class ISICClassCode(StrEnum):
    """ISIC Rev.4 Classes (Section + 4-digit code)."""

    # A - Agriculture, forestry and fishing

    A0111 = "A0111"
    A0112 = "A0112"
    A0113 = "A0113"
    A0114 = "A0114"
    A0115 = "A0115"
    A0116 = "A0116"
    A0119 = "A0119"

    A0121 = "A0121"
    A0122 = "A0122"
    A0123 = "A0123"
    A0124 = "A0124"
    A0125 = "A0125"
    A0126 = "A0126"
    A0127 = "A0127"
    A0128 = "A0128"
    A0129 = "A0129"

    A0130 = "A0130"
    A0141 = "A0141"
    A0142 = "A0142"
    A0143 = "A0143"
    A0144 = "A0144"
    A0145 = "A0145"
    A0146 = "A0146"
    A0149 = "A0149"

    A0150 = "A0150"
    A0161 = "A0161"
    A0162 = "A0162"
    A0163 = "A0163"
    A0164 = "A0164"
    A0170 = "A0170"

    A0210 = "A0210"
    A0220 = "A0220"
    A0230 = "A0230"
    A0240 = "A0240"

    A0311 = "A0311"
    A0312 = "A0312"
    A0321 = "A0321"
    A0322 = "A0322"

    # B - Mining and quarrying

    B0510 = "B0510"
    B0520 = "B0520"
    B0610 = "B0610"
    B0620 = "B0620"
    B0710 = "B0710"
    B0721 = "B0721"
    B0729 = "B0729"
    B0810 = "B0810"
    B0891 = "B0891"
    B0892 = "B0892"
    B0893 = "B0893"
    B0899 = "B0899"
    B0910 = "B0910"
    B0990 = "B0990"

    # C - Manufacturing

    C1010 = "C1010"
    C1020 = "C1020"
    C1030 = "C1030"
    C1040 = "C1040"
    C1050 = "C1050"
    C1061 = "C1061"
    C1062 = "C1062"
    C1071 = "C1071"
    C1072 = "C1072"
    C1073 = "C1073"
    C1074 = "C1074"
    C1075 = "C1075"
    C1079 = "C1079"
    C1080 = "C1080"
    C1101 = "C1101"
    C1102 = "C1102"
    C1103 = "C1103"
    C1104 = "C1104"
    C1105 = "C1105"
    C1106 = "C1106"
    C1200 = "C1200"

    C1311 = "C1311"
    C1312 = "C1312"
    C1313 = "C1313"
    C1391 = "C1391"
    C1392 = "C1392"
    C1393 = "C1393"
    C1394 = "C1394"
    C1399 = "C1399"

    C1410 = "C1410"
    C1420 = "C1420"
    C1430 = "C1430"

    C1511 = "C1511"
    C1512 = "C1512"
    C1520 = "C1520"

    C1610 = "C1610"
    C1621 = "C1621"
    C1622 = "C1622"
    C1623 = "C1623"
    C1629 = "C1629"

    C1701 = "C1701"
    C1702 = "C1702"

    C1811 = "C1811"
    C1812 = "C1812"
    C1820 = "C1820"

    C1910 = "C1910"
    C1920 = "C1920"

    C2011 = "C2011"
    C2012 = "C2012"
    C2013 = "C2013"
    C2014 = "C2014"
    C2015 = "C2015"
    C2016 = "C2016"
    C2017 = "C2017"
    C2021 = "C2021"
    C2022 = "C2022"
    C2023 = "C2023"
    C2029 = "C2029"
    C2030 = "C2030"

    C2100 = "C2100"

    C2211 = "C2211"
    C2219 = "C2219"
    C2220 = "C2220"

    C2310 = "C2310"
    C2391 = "C2391"
    C2392 = "C2392"
    C2393 = "C2393"
    C2394 = "C2394"
    C2395 = "C2395"
    C2396 = "C2396"
    C2399 = "C2399"

    C2410 = "C2410"
    C2420 = "C2420"
    C2431 = "C2431"
    C2432 = "C2432"

    C2511 = "C2511"
    C2512 = "C2512"
    C2513 = "C2513"
    C2520 = "C2520"
    C2591 = "C2591"
    C2592 = "C2592"
    C2593 = "C2593"
    C2599 = "C2599"

    C2610 = "C2610"
    C2620 = "C2620"
    C2630 = "C2630"
    C2640 = "C2640"
    C2651 = "C2651"
    C2652 = "C2652"
    C2660 = "C2660"
    C2670 = "C2670"
    C2680 = "C2680"

    C2710 = "C2710"
    C2720 = "C2720"
    C2731 = "C2731"
    C2732 = "C2732"
    C2733 = "C2733"
    C2740 = "C2740"
    C2750 = "C2750"
    C2790 = "C2790"

    C2811 = "C2811"
    C2812 = "C2812"
    C2813 = "C2813"
    C2814 = "C2814"
    C2815 = "C2815"
    C2816 = "C2816"
    C2817 = "C2817"
    C2818 = "C2818"
    C2819 = "C2819"
    C2821 = "C2821"
    C2822 = "C2822"
    C2823 = "C2823"
    C2824 = "C2824"
    C2825 = "C2825"
    C2826 = "C2826"
    C2829 = "C2829"
    C2891 = "C2891"
    C2892 = "C2892"
    C2893 = "C2893"
    C2899 = "C2899"

    C2910 = "C2910"
    C2920 = "C2920"
    C2930 = "C2930"

    C3011 = "C3011"
    C3012 = "C3012"
    C3020 = "C3020"
    C3030 = "C3030"
    C3040 = "C3040"
    C3091 = "C3091"
    C3092 = "C3092"
    C3099 = "C3099"

    C3100 = "C3100"

    C3211 = "C3211"
    C3212 = "C3212"
    C3220 = "C3220"
    C3230 = "C3230"
    C3240 = "C3240"
    C3250 = "C3250"
    C3290 = "C3290"

    C3311 = "C3311"
    C3312 = "C3312"
    C3313 = "C3313"
    C3314 = "C3314"
    C3315 = "C3315"
    C3319 = "C3319"
    C3320 = "C3320"

    # D - Electricity, gas, steam and air conditioning supply

    D3510 = "D3510"
    D3520 = "D3520"
    D3530 = "D3530"

    # E - Water supply; sewerage, waste management and remediation

    E3600 = "E3600"
    E3700 = "E3700"
    E3811 = "E3811"
    E3812 = "E3812"
    E3821 = "E3821"
    E3822 = "E3822"
    E3830 = "E3830"
    E3900 = "E3900"

    # F - Construction

    F4100 = "F4100"
    F4210 = "F4210"
    F4220 = "F4220"
    F4290 = "F4290"
    F4311 = "F4311"
    F4312 = "F4312"
    F4321 = "F4321"
    F4322 = "F4322"
    F4329 = "F4329"
    F4330 = "F4330"
    F4390 = "F4390"

    # G - Wholesale and retail trade; repair of motor vehicles

    G4510 = "G4510"
    G4520 = "G4520"
    G4530 = "G4530"
    G4540 = "G4540"
    G4610 = "G4610"
    G4620 = "G4620"
    G4630 = "G4630"
    G4641 = "G4641"
    G4649 = "G4649"
    G4651 = "G4651"
    G4652 = "G4652"
    G4653 = "G4653"
    G4659 = "G4659"
    G4661 = "G4661"
    G4662 = "G4662"
    G4663 = "G4663"
    G4669 = "G4669"
    G4690 = "G4690"
    G4711 = "G4711"
    G4719 = "G4719"
    G4721 = "G4721"
    G4722 = "G4722"
    G4723 = "G4723"
    G4724 = "G4724"
    G4729 = "G4729"
    G4730 = "G4730"
    G4741 = "G4741"
    G4742 = "G4742"
    G4751 = "G4751"
    G4752 = "G4752"
    G4753 = "G4753"
    G4759 = "G4759"
    G4761 = "G4761"
    G4762 = "G4762"
    G4763 = "G4763"
    G4764 = "G4764"
    G4769 = "G4769"
    G4771 = "G4771"
    G4772 = "G4772"
    G4773 = "G4773"
    G4774 = "G4774"
    G4775 = "G4775"
    G4778 = "G4778"
    G4779 = "G4779"
    G4781 = "G4781"
    G4782 = "G4782"
    G4789 = "G4789"
    G4791 = "G4791"
    G4799 = "G4799"

    # H - Transportation and storage

    H4911 = "H4911"
    H4912 = "H4912"
    H4921 = "H4921"
    H4922 = "H4922"
    H4923 = "H4923"
    H4930 = "H4930"
    H5011 = "H5011"
    H5012 = "H5012"
    H5021 = "H5021"
    H5022 = "H5022"
    H5110 = "H5110"
    H5120 = "H5120"
    H5210 = "H5210"
    H5221 = "H5221"
    H5222 = "H5222"
    H5223 = "H5223"
    H5224 = "H5224"
    H5229 = "H5229"
    H5310 = "H5310"
    H5320 = "H5320"

    # I - Accommodation and food service activities

    I5510 = "I5510"
    I5520 = "I5520"
    I5590 = "I5590"
    I5610 = "I5610"
    I5621 = "I5621"
    I5629 = "I5629"
    I5630 = "I5630"

    # J - Information and communication

    J5811 = "J5811"
    J5812 = "J5812"
    J5813 = "J5813"
    J5819 = "J5819"
    J5820 = "J5820"
    J5911 = "J5911"
    J5912 = "J5912"
    J5913 = "J5913"
    J5914 = "J5914"
    J5920 = "J5920"
    J6010 = "J6010"
    J6020 = "J6020"
    J6110 = "J6110"
    J6120 = "J6120"
    J6130 = "J6130"
    J6190 = "J6190"
    J6201 = "J6201"
    J6202 = "J6202"
    J6209 = "J6209"
    J6311 = "J6311"
    J6312 = "J6312"
    J6391 = "J6391"
    J6399 = "J6399"

    # K - Financial and insurance activities

    K6411 = "K6411"
    K6419 = "K6419"
    K6420 = "K6420"
    K6430 = "K6430"
    K6491 = "K6491"
    K6492 = "K6492"
    K6499 = "K6499"
    K6511 = "K6511"
    K6512 = "K6512"
    K6520 = "K6520"
    K6530 = "K6530"
    K6611 = "K6611"
    K6612 = "K6612"
    K6619 = "K6619"
    K6621 = "K6621"
    K6622 = "K6622"
    K6629 = "K6629"
    K6630 = "K6630"

    # L - Real estate activities

    L6810 = "L6810"
    L6820 = "L6820"

    # M - Professional, scientific and technical activities

    M6910 = "M6910"
    M6920 = "M6920"
    M7010 = "M7010"
    M7020 = "M7020"
    M7110 = "M7110"
    M7120 = "M7120"
    M7210 = "M7210"
    M7220 = "M7220"
    M7310 = "M7310"
    M7320 = "M7320"
    M7410 = "M7410"
    M7420 = "M7420"
    M7490 = "M7490"
    M7500 = "M7500"

    # N - Administrative and support service activities

    N7710 = "N7710"
    N7721 = "N7721"
    N7722 = "N7722"
    N7729 = "N7729"
    N7730 = "N7730"
    N7740 = "N7740"
    N7810 = "N7810"
    N7820 = "N7820"
    N7830 = "N7830"
    N7911 = "N7911"
    N7912 = "N7912"
    N7990 = "N7990"
    N8010 = "N8010"
    N8020 = "N8020"
    N8030 = "N8030"
    N8110 = "N8110"
    N8121 = "N8121"
    N8129 = "N8129"
    N8130 = "N8130"
    N8211 = "N8211"
    N8219 = "N8219"
    N8220 = "N8220"
    N8230 = "N8230"
    N8291 = "N8291"
    N8292 = "N8292"
    N8299 = "N8299"

    # O - Public administration and defence

    O8411 = "O8411"
    O8412 = "O8412"
    O8413 = "O8413"
    O8421 = "O8421"
    O8422 = "O8422"
    O8423 = "O8423"
    O8430 = "O8430"

    # P - Education

    P8510 = "P8510"
    P8521 = "P8521"
    P8522 = "P8522"
    P8530 = "P8530"
    P8541 = "P8541"
    P8542 = "P8542"
    P8549 = "P8549"
    P8550 = "P8550"
    P8560 = "P8560"

    # Q - Human health and social work activities

    Q8610 = "Q8610"
    Q8620 = "Q8620"
    Q8690 = "Q8690"
    Q8710 = "Q8710"
    Q8720 = "Q8720"
    Q8730 = "Q8730"
    Q8790 = "Q8790"
    Q8810 = "Q8810"
    Q8890 = "Q8890"

    # R - Arts, entertainment and recreation

    R9000 = "R9000"
    R9101 = "R9101"
    R9102 = "R9102"
    R9200 = "R9200"
    R9311 = "R9311"
    R9312 = "R9312"
    R9319 = "R9319"
    R9321 = "R9321"
    R9329 = "R9329"

    # S - Other service activities

    S9411 = "S9411"
    S9412 = "S9412"
    S9420 = "S9420"
    S9491 = "S9491"
    S9492 = "S9492"
    S9499 = "S9499"
    S9511 = "S9511"
    S9512 = "S9512"
    S9521 = "S9521"
    S9522 = "S9522"
    S9523 = "S9523"
    S9524 = "S9524"
    S9529 = "S9529"
    S9601 = "S9601"
    S9602 = "S9602"
    S9603 = "S9603"
    S9609 = "S9609"

    # T - Households

    T9700 = "T9700"
    T9810 = "T9810"
    T9820 = "T9820"

    # U - Extraterritorial organizations

    U9900 = "U9900"


class ISICClassName(StrEnum):
    """ISIC Rev.4 Class names (4-digit level)."""

    # A - Agriculture, forestry and fishing

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

    # B - Mining and quarrying

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

    # C - Manufacturing

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

    C2710 = (
        "Manufacture of electric motors, generators, transformers and electricity distribution and control apparatus"
    )
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

    # D - Electricity, gas, steam and air conditioning supply

    D3510 = "Electric power generation, transmission and distribution"
    D3520 = "Manufacture of gas; distribution of gaseous fuels through mains"
    D3530 = "Steam and air conditioning supply"

    # E - Water supply; sewerage, waste management and remediation activities

    E3600 = "Water collection, treatment and supply"
    E3700 = "Sewerage"

    E3811 = "Collection of non-hazardous waste"
    E3812 = "Collection of hazardous waste"

    E3821 = "Treatment and disposal of non-hazardous waste"
    E3822 = "Treatment and disposal of hazardous waste"

    E3830 = "Materials recovery"
    E3900 = "Remediation activities and other waste management services"

    # F - Construction

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

    # G - Wholesale and retail trade; repair of motor vehicles and motorcycles

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

    G4741 = (
        "Retail sale of computers, peripheral units, software and telecommunications equipment in specialized stores"
    )
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

    # H - Transportation and storage

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

    # I - Accommodation and food service activities

    I5510 = "Short term accommodation activities"
    I5520 = "Camping grounds, recreational vehicle parks and trailer parks"
    I5590 = "Other accommodation"

    I5610 = "Restaurants and mobile food service activities"
    I5621 = "Event catering activities"
    I5629 = "Other food service activities"
    I5630 = "Beverage serving activities"

    # J - Information and communication

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

    # K - Financial and insurance activities

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

    # L - Real estate activities

    L6810 = "Buying and selling of own real estate"
    L6820 = "Real estate activities on a fee or contract basis"

    # M - Professional, scientific and technical activities

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

    # N - Administrative and support service activities

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

    # O - Public administration and defence; compulsory social security

    O8411 = "General public administration activities"
    O8412 = "Regulation of the activities of providing health care, education, cultural services and other social services, excluding social security"
    O8413 = "Regulation of and contribution to more efficient operation of businesses"

    O8421 = "Foreign affairs"
    O8422 = "Defence activities"
    O8423 = "Public order and safety activities"

    O8430 = "Compulsory social security activities"

    # P - Education

    P8510 = "Pre-primary and primary education"

    P8521 = "General secondary education"
    P8522 = "Technical and vocational secondary education"

    P8530 = "Higher education"

    P8541 = "Sports and recreation education"
    P8542 = "Cultural education"
    P8549 = "Other education n.e.c."

    P8550 = "Educational support activities"
    P8560 = "Educational support services n.e.c."

    # Q - Human health and social work activities

    Q8610 = "Hospital activities"
    Q8620 = "Medical and dental practice activities"
    Q8690 = "Other human health activities"

    Q8710 = "Residential nursing care activities"
    Q8720 = "Residential care activities for mental retardation, mental health and substance abuse"
    Q8730 = "Residential care activities for the elderly and disabled"
    Q8790 = "Other residential care activities"

    Q8810 = "Social work activities without accommodation for the elderly and disabled"
    Q8890 = "Other social work activities without accommodation"

    # R - Arts, entertainment and recreation

    R9000 = "Creative, arts and entertainment activities"

    R9101 = "Library and archives activities"
    R9102 = "Museums activities and operation of historical sites and buildings"

    R9200 = "Gambling and betting activities"

    R9311 = "Operation of sports facilities"
    R9312 = "Activities of sports clubs"
    R9319 = "Other sports activities"

    R9321 = "Activities of amusement parks and theme parks"
    R9329 = "Other amusement and recreation activities n.e.c."

    # S - Other service activities

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

    # T - Activities of households as employers; undifferentiated goods- and services-producing activities of households for own use

    T9700 = "Activities of households as employers of domestic personnel"
    T9810 = "Undifferentiated goods-producing activities of private households for own use"
    T9820 = "Undifferentiated service-producing activities of private households for own use"

    # U - Activities of extraterritorial organizations and bodies

    U9900 = "Activities of extraterritorial organizations and bodies"

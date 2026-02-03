class A:
    """
    AGRICULTURE, FORESTRY AND FISHING

    This section includes the exploitation of vegetal and animal natural resources, comprising the activities of growing of crops, raising and breeding of animals, harvesting of timber and other plants, and the production of animal products from a farm or natural habitats.
    This section also includes organic agriculture, aquaculture, the growing of genetically modified crops and the raising of genetically modified animals.
    This section excludes undifferentiated subsistence goods-producing activities of households, which are classified in type 981000.
    """

class A01(A):
    """https://www.kubb-tool.bfs.admin.ch/en/noga/2025/01"""


class A011(A01):
    """https://www.kubb-tool.bfs.admin.ch/en/noga/2025/011"""


class A0111(A011):
    """https://www.kubb-tool.bfs.admin.ch/en/noga/2025/0111"""


class A011100(A0111):
    """https://www.kubb-tool.bfs.admin.ch/en/noga/2025/011100"""



class Section:
    pass

class Division:
    pass

class Group:
    pass

class Class:
    pass 

class Category:
    pass


def noga(description: str) -> tuple[Section, Division, Group, Class, Category]:
    """Given a description, return the corresponding NOGA classification codes."""
    return (Section(), Division(), Group(), Class(), Category())

from decimal import Decimal

project = "Garden Apartments"
costs = [Decimal("12500.00"), Decimal("8700.50"), Decimal("3200.00")]
total = sum(costs)

print(f"{project}: {total:,.2f}")

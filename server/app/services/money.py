"""
Integer minor-unit arithmetic for financial calculations.
All monetary values are stored as integer minor units (paise for INR).
Never use floating point for stored monetary amounts.
"""
from app.models.common import SplitMethod


def format_minor(amount_minor: int, currency: str = "INR") -> str:
    """Format integer minor units to human-readable currency string."""
    if currency == "INR":
        major = amount_minor // 100
        minor = amount_minor % 100
        if minor == 0:
            return f"₹{major:,}"
        return f"₹{major:,}.{minor:02d}"
    return f"{amount_minor / 100:.2f} {currency}"


def calculate_equal_splits(total_minor: int, count: int) -> list[int]:
    """
    Divide total_minor equally among count participants.
    Distributes remainder (paise) to the first participants.
    Returns list of share amounts that sum exactly to total_minor.
    """
    if count <= 0:
        raise ValueError("count must be positive")
    base = total_minor // count
    remainder = total_minor % count
    shares = [base] * count
    for i in range(remainder):
        shares[i] += 1
    assert sum(shares) == total_minor, "Split reconciliation failed"
    return shares


def calculate_percentage_splits(
    total_minor: int, percentages: list[float]
) -> list[int]:
    """
    Convert percentages to minor unit shares.
    Adjusts the last participant to absorb rounding residual.
    Returns list of share amounts that sum exactly to total_minor.
    """
    if abs(sum(percentages) - 100.0) > 0.001:
        raise ValueError(f"Percentages must sum to 100 (got {sum(percentages)})")
    shares = [round(total_minor * pct / 100) for pct in percentages]
    # Absorb rounding error in last share
    diff = total_minor - sum(shares)
    shares[-1] += diff
    assert sum(shares) == total_minor, "Percentage split reconciliation failed"
    return shares


def validate_custom_splits(total_minor: int, shares: list[int]) -> bool:
    """Verify custom split amounts reconcile to total."""
    return sum(shares) == total_minor


def calculate_net_balance(
    paid_minor: int,
    owed_minor: int,
    settled_minor: int,
) -> int:
    """
    Calculate net balance for a participant.
    Positive = should receive money.
    Negative = owes money.
    """
    return paid_minor - (owed_minor - settled_minor)

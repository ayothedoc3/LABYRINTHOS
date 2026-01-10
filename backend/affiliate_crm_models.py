"""
Affiliate CRM Models
Pydantic models for referral tracking and commission management
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class AffiliateStatus(str, Enum):
    """Affiliate account status"""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class AffiliateTier(str, Enum):
    """Affiliate tier levels"""
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"


class ReferralStatus(str, Enum):
    """Referral status"""
    PENDING = "PENDING"
    QUALIFIED = "QUALIFIED"
    CONVERTED = "CONVERTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class CommissionStatus(str, Enum):
    """Commission payment status"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


# Tier configuration with commission rates
AFFILIATE_TIER_CONFIG = {
    AffiliateTier.BRONZE: {
        "display_name": "Bronze",
        "color": "#CD7F32",
        "commission_rate": 10.0,  # 10%
        "min_conversions": 0,
        "benefits": ["Basic referral link", "Monthly payouts"]
    },
    AffiliateTier.SILVER: {
        "display_name": "Silver",
        "color": "#C0C0C0",
        "commission_rate": 15.0,  # 15%
        "min_conversions": 5,
        "benefits": ["Custom referral link", "Bi-weekly payouts", "Priority support"]
    },
    AffiliateTier.GOLD: {
        "display_name": "Gold",
        "color": "#FFD700",
        "commission_rate": 20.0,  # 20%
        "min_conversions": 15,
        "benefits": ["Custom landing page", "Weekly payouts", "Dedicated manager", "Co-marketing"]
    },
    AffiliateTier.PLATINUM: {
        "display_name": "Platinum",
        "color": "#E5E4E2",
        "commission_rate": 25.0,  # 25%
        "min_conversions": 30,
        "benefits": ["All Gold benefits", "Revenue share options", "Strategic partnership", "Event invites"]
    }
}


class AffiliateBase(BaseModel):
    """Base affiliate model"""
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    payment_method: str = "bank_transfer"  # bank_transfer, paypal, crypto
    payment_details: Optional[dict] = None


class AffiliateCreate(AffiliateBase):
    """Model for creating an affiliate"""
    pass


class Affiliate(AffiliateBase):
    """Full affiliate model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: AffiliateStatus = AffiliateStatus.PENDING
    tier: AffiliateTier = AffiliateTier.BRONZE
    referral_code: str = Field(default_factory=lambda: f"REF-{uuid.uuid4().hex[:8].upper()}")
    referral_link: Optional[str] = None
    total_referrals: int = 0
    total_conversions: int = 0
    total_earnings: float = 0.0
    pending_earnings: float = 0.0
    conversion_rate: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_referral_at: Optional[datetime] = None


class ReferralBase(BaseModel):
    """Base referral model"""
    affiliate_id: str
    referred_name: str
    referred_email: str
    referred_company: Optional[str] = None
    notes: Optional[str] = None


class ReferralCreate(ReferralBase):
    """Model for creating a referral"""
    pass


class Referral(ReferralBase):
    """Full referral model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: ReferralStatus = ReferralStatus.PENDING
    lead_id: Optional[str] = None  # Link to Sales CRM lead
    contract_id: Optional[str] = None  # Link to Contract if converted
    deal_value: Optional[float] = None
    commission_rate: float = 10.0  # Percentage
    commission_amount: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    qualified_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None


class CommissionBase(BaseModel):
    """Base commission model"""
    affiliate_id: str
    referral_id: str
    amount: float
    description: Optional[str] = None


class Commission(CommissionBase):
    """Full commission model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: CommissionStatus = CommissionStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    payment_reference: Optional[str] = None


class AffiliateCRMStats(BaseModel):
    """Affiliate CRM statistics"""
    total_affiliates: int = 0
    active_affiliates: int = 0
    affiliates_by_tier: dict = {}
    total_referrals: int = 0
    total_conversions: int = 0
    overall_conversion_rate: float = 0.0
    total_commissions_paid: float = 0.0
    pending_commissions: float = 0.0
    top_affiliates: List[dict] = []

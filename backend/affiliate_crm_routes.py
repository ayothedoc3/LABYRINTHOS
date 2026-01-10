"""
Affiliate CRM Routes
API endpoints for referral tracking and commission management
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from affiliate_crm_models import (
    Affiliate, AffiliateCreate, AffiliateStatus, AffiliateTier,
    Referral, ReferralCreate, ReferralStatus,
    Commission, CommissionStatus,
    AFFILIATE_TIER_CONFIG, AffiliateCRMStats
)

router = APIRouter(prefix="/api/affiliates", tags=["Affiliate CRM"])

# In-memory storage (would be MongoDB in production)
affiliates_db: dict[str, Affiliate] = {}
referrals_db: dict[str, Referral] = {}
commissions_db: dict[str, Commission] = {}


def seed_demo_affiliates():
    """Seed demo affiliate data"""
    base_url = "https://labyrinth.example.com"
    
    demo_affiliates = [
        Affiliate(
            id="affiliate-1",
            name="Alex Thompson",
            email="alex.thompson@partners.com",
            company="Thompson Consulting",
            website="https://thompsonconsulting.com",
            status=AffiliateStatus.ACTIVE,
            tier=AffiliateTier.GOLD,
            referral_code="REF-ALEX2024",
            referral_link=f"{base_url}?ref=REF-ALEX2024",
            total_referrals=28,
            total_conversions=18,
            total_earnings=45000,
            pending_earnings=3500,
            conversion_rate=64.3,
            last_referral_at=datetime.now(timezone.utc) - timedelta(days=2)
        ),
        Affiliate(
            id="affiliate-2",
            name="Maria Garcia",
            email="maria@businessgrowth.io",
            company="Business Growth IO",
            status=AffiliateStatus.ACTIVE,
            tier=AffiliateTier.PLATINUM,
            referral_code="REF-MARIA24",
            referral_link=f"{base_url}?ref=REF-MARIA24",
            total_referrals=45,
            total_conversions=32,
            total_earnings=125000,
            pending_earnings=8000,
            conversion_rate=71.1,
            last_referral_at=datetime.now(timezone.utc) - timedelta(hours=12)
        ),
        Affiliate(
            id="affiliate-3",
            name="James Wilson",
            email="jwilson@techpartners.net",
            company="Tech Partners Network",
            status=AffiliateStatus.ACTIVE,
            tier=AffiliateTier.SILVER,
            referral_code="REF-JAMES99",
            referral_link=f"{base_url}?ref=REF-JAMES99",
            total_referrals=12,
            total_conversions=6,
            total_earnings=9000,
            pending_earnings=1500,
            conversion_rate=50.0,
            last_referral_at=datetime.now(timezone.utc) - timedelta(days=5)
        ),
        Affiliate(
            id="affiliate-4",
            name="Sophie Chen",
            email="sophie@digitalagency.co",
            company="Digital Agency Co",
            status=AffiliateStatus.ACTIVE,
            tier=AffiliateTier.BRONZE,
            referral_code="REF-SOPHIE1",
            referral_link=f"{base_url}?ref=REF-SOPHIE1",
            total_referrals=4,
            total_conversions=2,
            total_earnings=2000,
            pending_earnings=500,
            conversion_rate=50.0
        ),
        Affiliate(
            id="affiliate-5",
            name="David Kim",
            email="david.kim@example.com",
            status=AffiliateStatus.PENDING,
            tier=AffiliateTier.BRONZE,
            referral_code="REF-DAVID77",
            referral_link=f"{base_url}?ref=REF-DAVID77",
            total_referrals=0,
            total_conversions=0,
            total_earnings=0,
            pending_earnings=0,
            conversion_rate=0.0
        )
    ]
    
    for affiliate in demo_affiliates:
        affiliates_db[affiliate.id] = affiliate
    
    # Create demo referrals
    demo_referrals = [
        Referral(
            id="referral-1",
            affiliate_id="affiliate-1",
            referred_name="TechStart Inc",
            referred_email="contact@techstart.com",
            referred_company="TechStart Inc",
            status=ReferralStatus.CONVERTED,
            deal_value=15000,
            commission_rate=20.0,
            commission_amount=3000,
            converted_at=datetime.now(timezone.utc) - timedelta(days=10)
        ),
        Referral(
            id="referral-2",
            affiliate_id="affiliate-2",
            referred_name="Global Solutions",
            referred_email="info@globalsolutions.com",
            referred_company="Global Solutions Ltd",
            status=ReferralStatus.QUALIFIED,
            deal_value=50000,
            commission_rate=25.0,
            qualified_at=datetime.now(timezone.utc) - timedelta(days=3)
        ),
        Referral(
            id="referral-3",
            affiliate_id="affiliate-1",
            referred_name="Startup Hub",
            referred_email="hello@startuphub.io",
            status=ReferralStatus.PENDING,
            commission_rate=20.0
        )
    ]
    
    for referral in demo_referrals:
        referrals_db[referral.id] = referral
    
    # Create demo commissions
    demo_commissions = [
        Commission(
            id="commission-1",
            affiliate_id="affiliate-1",
            referral_id="referral-1",
            amount=3000,
            status=CommissionStatus.PAID,
            description="Commission for TechStart Inc conversion",
            paid_at=datetime.now(timezone.utc) - timedelta(days=5),
            payment_reference="PAY-2024-001"
        ),
        Commission(
            id="commission-2",
            affiliate_id="affiliate-2",
            referral_id="referral-2",
            amount=12500,
            status=CommissionStatus.PENDING,
            description="Commission for Global Solutions (pending conversion)"
        )
    ]
    
    for commission in demo_commissions:
        commissions_db[commission.id] = commission


# ==================== AFFILIATE ENDPOINTS ====================

@router.get("/", response_model=List[Affiliate])
async def get_affiliates(
    status: Optional[AffiliateStatus] = None,
    tier: Optional[AffiliateTier] = None
):
    """Get all affiliates with optional filtering"""
    if not affiliates_db:
        seed_demo_affiliates()
    
    affiliates = list(affiliates_db.values())
    
    if status:
        affiliates = [a for a in affiliates if a.status == status]
    if tier:
        affiliates = [a for a in affiliates if a.tier == tier]
    
    return sorted(affiliates, key=lambda x: x.total_earnings, reverse=True)


@router.get("/{affiliate_id}", response_model=Affiliate)
async def get_affiliate(affiliate_id: str):
    """Get a specific affiliate"""
    if affiliate_id not in affiliates_db:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    return affiliates_db[affiliate_id]


@router.post("/", response_model=Affiliate)
async def create_affiliate(affiliate_data: AffiliateCreate):
    """Create a new affiliate"""
    base_url = "https://labyrinth.example.com"
    referral_code = f"REF-{uuid.uuid4().hex[:8].upper()}"
    
    affiliate = Affiliate(
        **affiliate_data.model_dump(),
        id=str(uuid.uuid4()),
        referral_code=referral_code,
        referral_link=f"{base_url}?ref={referral_code}"
    )
    affiliates_db[affiliate.id] = affiliate
    return affiliate


@router.put("/{affiliate_id}/status")
async def update_affiliate_status(affiliate_id: str, status: AffiliateStatus):
    """Update affiliate status"""
    if affiliate_id not in affiliates_db:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    affiliate = affiliates_db[affiliate_id]
    affiliate.status = status
    affiliate.updated_at = datetime.now(timezone.utc)
    affiliates_db[affiliate_id] = affiliate
    return affiliate


@router.put("/{affiliate_id}/tier")
async def update_affiliate_tier(affiliate_id: str, tier: AffiliateTier):
    """Update affiliate tier"""
    if affiliate_id not in affiliates_db:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    affiliate = affiliates_db[affiliate_id]
    affiliate.tier = tier
    affiliate.updated_at = datetime.now(timezone.utc)
    affiliates_db[affiliate_id] = affiliate
    return affiliate


@router.get("/{affiliate_id}/referrals", response_model=List[Referral])
async def get_affiliate_referrals(affiliate_id: str):
    """Get all referrals for an affiliate"""
    if affiliate_id not in affiliates_db:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    return [r for r in referrals_db.values() if r.affiliate_id == affiliate_id]


@router.get("/{affiliate_id}/commissions", response_model=List[Commission])
async def get_affiliate_commissions(affiliate_id: str):
    """Get all commissions for an affiliate"""
    if affiliate_id not in affiliates_db:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    return [c for c in commissions_db.values() if c.affiliate_id == affiliate_id]


# ==================== TIER ENDPOINTS ====================

@router.get("/tiers/info")
async def get_tier_info():
    """Get tier configuration information"""
    return [
        {
            "tier": tier.value,
            **config
        }
        for tier, config in AFFILIATE_TIER_CONFIG.items()
    ]


# ==================== REFERRAL ENDPOINTS ====================

@router.get("/referrals/all", response_model=List[Referral])
async def get_all_referrals(status: Optional[ReferralStatus] = None):
    """Get all referrals"""
    referrals = list(referrals_db.values())
    if status:
        referrals = [r for r in referrals if r.status == status]
    return sorted(referrals, key=lambda x: x.created_at, reverse=True)


@router.post("/referrals", response_model=Referral)
async def create_referral(referral_data: ReferralCreate):
    """Create a new referral"""
    if referral_data.affiliate_id not in affiliates_db:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    affiliate = affiliates_db[referral_data.affiliate_id]
    tier_config = AFFILIATE_TIER_CONFIG.get(affiliate.tier, {})
    
    referral = Referral(
        **referral_data.model_dump(),
        id=str(uuid.uuid4()),
        commission_rate=tier_config.get("commission_rate", 10.0)
    )
    referrals_db[referral.id] = referral
    
    # Update affiliate stats
    affiliate.total_referrals += 1
    affiliate.last_referral_at = datetime.now(timezone.utc)
    affiliate.updated_at = datetime.now(timezone.utc)
    affiliates_db[affiliate.id] = affiliate
    
    return referral


@router.post("/referrals/{referral_id}/qualify")
async def qualify_referral(referral_id: str, deal_value: float):
    """Mark a referral as qualified"""
    if referral_id not in referrals_db:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    referral = referrals_db[referral_id]
    referral.status = ReferralStatus.QUALIFIED
    referral.deal_value = deal_value
    referral.commission_amount = deal_value * (referral.commission_rate / 100)
    referral.qualified_at = datetime.now(timezone.utc)
    referral.updated_at = datetime.now(timezone.utc)
    referrals_db[referral_id] = referral
    
    return referral


@router.post("/referrals/{referral_id}/convert")
async def convert_referral(referral_id: str, contract_id: Optional[str] = None):
    """Mark a referral as converted"""
    if referral_id not in referrals_db:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    referral = referrals_db[referral_id]
    referral.status = ReferralStatus.CONVERTED
    referral.contract_id = contract_id
    referral.converted_at = datetime.now(timezone.utc)
    referral.updated_at = datetime.now(timezone.utc)
    referrals_db[referral_id] = referral
    
    # Update affiliate stats
    if referral.affiliate_id in affiliates_db:
        affiliate = affiliates_db[referral.affiliate_id]
        affiliate.total_conversions += 1
        affiliate.conversion_rate = (affiliate.total_conversions / affiliate.total_referrals * 100) if affiliate.total_referrals > 0 else 0
        
        # Add pending commission
        if referral.commission_amount:
            affiliate.pending_earnings += referral.commission_amount
            
            # Create commission record
            commission = Commission(
                affiliate_id=affiliate.id,
                referral_id=referral_id,
                amount=referral.commission_amount,
                description=f"Commission for {referral.referred_name} conversion"
            )
            commissions_db[commission.id] = commission
        
        # Check for tier upgrade
        tier_config = AFFILIATE_TIER_CONFIG
        for tier in [AffiliateTier.PLATINUM, AffiliateTier.GOLD, AffiliateTier.SILVER]:
            if affiliate.total_conversions >= tier_config[tier]["min_conversions"]:
                if tier.value > affiliate.tier.value or (
                    list(AffiliateTier).index(tier) > list(AffiliateTier).index(affiliate.tier)
                ):
                    affiliate.tier = tier
                break
        
        affiliate.updated_at = datetime.now(timezone.utc)
        affiliates_db[affiliate.id] = affiliate
    
    return referral


# ==================== COMMISSION ENDPOINTS ====================

@router.get("/commissions/all", response_model=List[Commission])
async def get_all_commissions(status: Optional[CommissionStatus] = None):
    """Get all commissions"""
    commissions = list(commissions_db.values())
    if status:
        commissions = [c for c in commissions if c.status == status]
    return sorted(commissions, key=lambda x: x.created_at, reverse=True)


@router.post("/commissions/{commission_id}/approve")
async def approve_commission(commission_id: str):
    """Approve a commission for payment"""
    if commission_id not in commissions_db:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    commission = commissions_db[commission_id]
    commission.status = CommissionStatus.APPROVED
    commission.approved_at = datetime.now(timezone.utc)
    commissions_db[commission_id] = commission
    
    return commission


@router.post("/commissions/{commission_id}/pay")
async def pay_commission(commission_id: str, payment_reference: str):
    """Mark a commission as paid"""
    if commission_id not in commissions_db:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    commission = commissions_db[commission_id]
    commission.status = CommissionStatus.PAID
    commission.paid_at = datetime.now(timezone.utc)
    commission.payment_reference = payment_reference
    commissions_db[commission_id] = commission
    
    # Update affiliate earnings
    if commission.affiliate_id in affiliates_db:
        affiliate = affiliates_db[commission.affiliate_id]
        affiliate.pending_earnings -= commission.amount
        affiliate.total_earnings += commission.amount
        affiliate.updated_at = datetime.now(timezone.utc)
        affiliates_db[affiliate.id] = affiliate
    
    return commission


# ==================== STATS ENDPOINTS ====================

@router.get("/stats", response_model=AffiliateCRMStats)
async def get_affiliate_stats():
    """Get affiliate CRM statistics"""
    if not affiliates_db:
        seed_demo_affiliates()
    
    affiliates = list(affiliates_db.values())
    referrals = list(referrals_db.values())
    commissions = list(commissions_db.values())
    
    # Affiliates by tier
    tier_counts = {}
    for tier in AffiliateTier:
        tier_counts[tier.value] = len([a for a in affiliates if a.tier == tier])
    
    # Active affiliates
    active_count = len([a for a in affiliates if a.status == AffiliateStatus.ACTIVE])
    
    # Referral stats
    total_referrals = len(referrals)
    converted = len([r for r in referrals if r.status == ReferralStatus.CONVERTED])
    conversion_rate = (converted / total_referrals * 100) if total_referrals > 0 else 0
    
    # Commission stats
    paid_commissions = sum(c.amount for c in commissions if c.status == CommissionStatus.PAID)
    pending_commissions = sum(c.amount for c in commissions if c.status in [CommissionStatus.PENDING, CommissionStatus.APPROVED])
    
    # Top affiliates
    top_affiliates = sorted(affiliates, key=lambda x: x.total_earnings, reverse=True)[:5]
    
    return AffiliateCRMStats(
        total_affiliates=len(affiliates),
        active_affiliates=active_count,
        affiliates_by_tier=tier_counts,
        total_referrals=total_referrals,
        total_conversions=converted,
        overall_conversion_rate=round(conversion_rate, 1),
        total_commissions_paid=paid_commissions,
        pending_commissions=pending_commissions,
        top_affiliates=[
            {
                "id": a.id,
                "name": a.name,
                "tier": a.tier.value,
                "total_earnings": a.total_earnings,
                "conversion_rate": a.conversion_rate
            }
            for a in top_affiliates
        ]
    )


@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo data for affiliate CRM"""
    affiliates_db.clear()
    referrals_db.clear()
    commissions_db.clear()
    seed_demo_affiliates()
    return {
        "message": f"Seeded {len(affiliates_db)} affiliates, {len(referrals_db)} referrals, {len(commissions_db)} commissions"
    }

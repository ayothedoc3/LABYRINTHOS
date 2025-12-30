"""
Labyrinth Operating System - Gate Logic
7-Gate Constraint System Implementation
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from models import (
    GateType, GateStatus, GateExecutionResult, GateLog, Alert, AlertStatus,
    LevelType, FunctionType, ClientPackage, Playbook, Talent, SOP, KPI, Contract,
    AlertCreate
)
import uuid


class LabyrinthGateEngine:
    """
    The Labyrinth Gate Engine - Controls execution paths through 7 sequential gates.
    Each gate enforces constraints and blocks invalid paths.
    """
    
    # Gate sequence - each gate must pass before proceeding
    GATE_SEQUENCE = [
        GateType.STRATEGY_SELECTION,
        GateType.LEVEL_SELECTION,
        GateType.PLAYBOOK_SELECTION,
        GateType.TALENT_MATCHING,
        GateType.SOP_ACTIVATION,
        GateType.CONTRACT_ENFORCEMENT,
        GateType.KPI_FEEDBACK
    ]
    
    # Client package to default level mapping
    PACKAGE_LEVEL_MAP = {
        ClientPackage.BRONZE: [LevelType.ACQUIRE],
        ClientPackage.SILVER: [LevelType.ACQUIRE, LevelType.MAINTAIN],
        ClientPackage.GOLD: [LevelType.MAINTAIN],
        ClientPackage.BLACK: [LevelType.MAINTAIN, LevelType.SCALE]
    }
    
    def __init__(self):
        self.logs: List[GateLog] = []
    
    def get_next_gate(self, current_gate: GateType) -> Optional[GateType]:
        """Get the next gate in sequence"""
        try:
            idx = self.GATE_SEQUENCE.index(current_gate)
            if idx < len(self.GATE_SEQUENCE) - 1:
                return self.GATE_SEQUENCE[idx + 1]
        except ValueError:
            pass
        return None
    
    # ==================== GATE 1: STRATEGY SELECTION ====================
    
    def execute_gate_1_strategy(
        self,
        client_package: ClientPackage,
        context: Dict[str, Any] = {}
    ) -> GateExecutionResult:
        """
        Gate 1: Strategy Selection
        - Eliminates 80% of options based on client package
        - Determines which levels are available
        """
        available_levels = self.PACKAGE_LEVEL_MAP.get(client_package, [])
        
        if not available_levels:
            return GateExecutionResult(
                gate_type=GateType.STRATEGY_SELECTION,
                status=GateStatus.BLOCKED,
                message=f"Invalid client package: {client_package}",
                blocked_reason="No levels available for this package"
            )
        
        return GateExecutionResult(
            gate_type=GateType.STRATEGY_SELECTION,
            status=GateStatus.PASSED,
            message=f"Strategy selected for {client_package.value} package",
            details={
                "client_package": client_package.value,
                "available_levels": [lvl.value for lvl in available_levels],
                "eliminated_options": f"{100 - len(available_levels) * 33}%"
            },
            next_gate=GateType.LEVEL_SELECTION
        )
    
    # ==================== GATE 2: LEVEL SELECTION ====================
    
    def execute_gate_2_level(
        self,
        client_package: ClientPackage,
        selected_level: LevelType,
        context: Dict[str, Any] = {}
    ) -> GateExecutionResult:
        """
        Gate 2: Level Selection
        - Validates selected level against client package
        - Sets phase context (ACQUIRE/MAINTAIN/SCALE)
        """
        available_levels = self.PACKAGE_LEVEL_MAP.get(client_package, [])
        
        if selected_level not in available_levels:
            return GateExecutionResult(
                gate_type=GateType.LEVEL_SELECTION,
                status=GateStatus.BLOCKED,
                message=f"Level {selected_level.value} not available for {client_package.value} package",
                blocked_reason=f"Package {client_package.value} only allows: {[lvl.value for lvl in available_levels]}",
                details={
                    "requested_level": selected_level.value,
                    "available_levels": [lvl.value for lvl in available_levels]
                }
            )
        
        return GateExecutionResult(
            gate_type=GateType.LEVEL_SELECTION,
            status=GateStatus.PASSED,
            message=f"Level {selected_level.value} selected",
            details={
                "selected_level": selected_level.value,
                "phase_context": selected_level.value
            },
            next_gate=GateType.PLAYBOOK_SELECTION
        )
    
    # ==================== GATE 3: PLAYBOOK SELECTION ====================
    
    def execute_gate_3_playbook(
        self,
        playbook: Playbook,
        selected_level: LevelType,
        function: FunctionType,
        context: Dict[str, Any] = {}
    ) -> GateExecutionResult:
        """
        Gate 3: Playbook Selection
        - One playbook per function
        - Validates playbook matches level and function
        """
        errors = []
        
        if playbook.level != selected_level:
            errors.append(f"Playbook level ({playbook.level.value}) doesn't match selected level ({selected_level.value})")
        
        if playbook.function != function:
            errors.append(f"Playbook function ({playbook.function.value}) doesn't match selected function ({function.value})")
        
        if not playbook.is_active:
            errors.append("Playbook is not active")
        
        if errors:
            return GateExecutionResult(
                gate_type=GateType.PLAYBOOK_SELECTION,
                status=GateStatus.BLOCKED,
                message="Playbook validation failed",
                blocked_reason="; ".join(errors),
                details={
                    "playbook_id": playbook.playbook_id,
                    "errors": errors
                }
            )
        
        return GateExecutionResult(
            gate_type=GateType.PLAYBOOK_SELECTION,
            status=GateStatus.PASSED,
            message=f"Playbook {playbook.name} selected",
            details={
                "playbook_id": playbook.playbook_id,
                "playbook_name": playbook.name,
                "min_tier_required": playbook.min_tier,
                "linked_sops": playbook.linked_sop_ids
            },
            next_gate=GateType.TALENT_MATCHING
        )
    
    # ==================== GATE 4: TALENT MATCHING (CRITICAL) ====================
    
    def execute_gate_4_talent_matching(
        self,
        talent: Talent,
        playbook: Playbook,
        context: Dict[str, Any] = {}
    ) -> Tuple[GateExecutionResult, Optional[AlertCreate]]:
        """
        Gate 4: Talent Matching (MOST CRITICAL)
        - Enforces tier requirements
        - Blocks if talent tier < playbook min_tier
        - Creates alerts on blocks
        """
        alert = None
        
        # Calculate current tier from competency scores
        talent_tier = talent.current_tier
        required_tier = playbook.min_tier
        
        if talent_tier < required_tier:
            # Create block alert
            alert = AlertCreate(
                alert_type="GATE_BLOCK",
                severity=AlertStatus.RED,
                function=playbook.function,
                title=f"Gate 4 Block: Tier Mismatch",
                message=f"Talent {talent.name} (Tier {talent_tier}) cannot execute playbook {playbook.name} (requires Tier {required_tier})",
                details={
                    "gate": "TALENT_MATCHING",
                    "talent_id": talent.id,
                    "talent_name": talent.name,
                    "talent_tier": talent_tier,
                    "talent_score": talent.tier_score,
                    "playbook_id": playbook.playbook_id,
                    "playbook_name": playbook.name,
                    "required_tier": required_tier,
                    "resolution": "Upgrade talent tier OR select different playbook OR assign different talent"
                }
            )
            
            return GateExecutionResult(
                gate_type=GateType.TALENT_MATCHING,
                status=GateStatus.BLOCKED,
                message=f"TIER MISMATCH: {talent.name} (Tier {talent_tier}) cannot execute {playbook.name} (requires Tier {required_tier})",
                blocked_reason=f"Talent tier ({talent_tier}) is below minimum required tier ({required_tier})",
                details={
                    "talent_id": talent.id,
                    "talent_name": talent.name,
                    "talent_tier": talent_tier,
                    "talent_score": talent.tier_score,
                    "competency_scores": talent.competency_scores.model_dump(),
                    "playbook_id": playbook.playbook_id,
                    "required_tier": required_tier,
                    "tier_gap": required_tier - talent_tier
                }
            ), alert
        
        # Check function match
        if talent.function != playbook.function:
            alert = AlertCreate(
                alert_type="GATE_BLOCK",
                severity=AlertStatus.YELLOW,
                function=playbook.function,
                title=f"Gate 4 Warning: Function Mismatch",
                message=f"Talent {talent.name} ({talent.function.value}) assigned to {playbook.function.value} playbook",
                details={
                    "talent_function": talent.function.value,
                    "playbook_function": playbook.function.value
                }
            )
            # This is a warning, not a block - cross-functional assignment allowed with warning
        
        return GateExecutionResult(
            gate_type=GateType.TALENT_MATCHING,
            status=GateStatus.PASSED,
            message=f"Talent {talent.name} (Tier {talent_tier}) matched to {playbook.name}",
            details={
                "talent_id": talent.id,
                "talent_name": talent.name,
                "talent_tier": talent_tier,
                "playbook_id": playbook.playbook_id,
                "tier_match": True,
                "tier_headroom": talent_tier - required_tier
            },
            next_gate=GateType.SOP_ACTIVATION
        ), alert
    
    # ==================== GATE 5: SOP ACTIVATION ====================
    
    def execute_gate_5_sop_activation(
        self,
        playbook: Playbook,
        available_sops: List[SOP],
        context: Dict[str, Any] = {}
    ) -> GateExecutionResult:
        """
        Gate 5: SOP Activation
        - Activates SOPs linked to the selected playbook
        - Filters by active status
        """
        linked_sop_ids = playbook.linked_sop_ids
        
        # Find matching SOPs
        activated_sops = []
        missing_sops = []
        
        sop_map = {sop.sop_id: sop for sop in available_sops}
        
        for sop_id in linked_sop_ids:
            if sop_id in sop_map:
                sop = sop_map[sop_id]
                if sop.is_active:
                    activated_sops.append({
                        "sop_id": sop.sop_id,
                        "name": sop.name,
                        "template": sop.template_required,
                        "estimated_time": sop.estimated_time_minutes,
                        "steps_count": len(sop.steps)
                    })
                else:
                    missing_sops.append(f"{sop_id} (inactive)")
            else:
                missing_sops.append(f"{sop_id} (not found)")
        
        if not activated_sops:
            return GateExecutionResult(
                gate_type=GateType.SOP_ACTIVATION,
                status=GateStatus.BLOCKED,
                message="No SOPs available for activation",
                blocked_reason=f"Missing SOPs: {missing_sops}",
                details={
                    "playbook_id": playbook.playbook_id,
                    "requested_sops": linked_sop_ids,
                    "missing_sops": missing_sops
                }
            )
        
        return GateExecutionResult(
            gate_type=GateType.SOP_ACTIVATION,
            status=GateStatus.PASSED,
            message=f"Activated {len(activated_sops)} SOP(s) for {playbook.name}",
            details={
                "playbook_id": playbook.playbook_id,
                "activated_sops": activated_sops,
                "missing_sops": missing_sops if missing_sops else None,
                "total_estimated_time": sum(s["estimated_time"] for s in activated_sops)
            },
            next_gate=GateType.CONTRACT_ENFORCEMENT
        )
    
    # ==================== GATE 6: CONTRACT ENFORCEMENT ====================
    
    def execute_gate_6_contract(
        self,
        talent: Talent,
        playbook: Playbook,
        contract: Optional[Contract],
        context: Dict[str, Any] = {}
    ) -> Tuple[GateExecutionResult, Optional[AlertCreate]]:
        """
        Gate 6: Contract Enforcement
        - Validates talent has valid contract
        - Checks contract boundaries
        """
        alert = None
        
        if not contract:
            alert = AlertCreate(
                alert_type="CONTRACT_VIOLATION",
                severity=AlertStatus.RED,
                function=playbook.function,
                title="Gate 6 Block: No Contract",
                message=f"Talent {talent.name} has no active contract for this assignment",
                details={
                    "talent_id": talent.id,
                    "playbook_id": playbook.playbook_id
                }
            )
            
            return GateExecutionResult(
                gate_type=GateType.CONTRACT_ENFORCEMENT,
                status=GateStatus.BLOCKED,
                message=f"No active contract found for {talent.name}",
                blocked_reason="Talent must have valid contract before assignment",
                details={
                    "talent_id": talent.id,
                    "resolution": "Create contract for talent"
                }
            ), alert
        
        # Check if contract is active
        if not contract.is_active:
            return GateExecutionResult(
                gate_type=GateType.CONTRACT_ENFORCEMENT,
                status=GateStatus.BLOCKED,
                message="Contract is not active",
                blocked_reason="Contract has been deactivated",
                details={"contract_id": contract.id}
            ), None
        
        # Check if contract covers this playbook
        if playbook.playbook_id not in contract.assigned_playbook_ids:
            # Not a hard block, but a warning
            alert = AlertCreate(
                alert_type="CONTRACT_VIOLATION",
                severity=AlertStatus.YELLOW,
                function=playbook.function,
                title="Gate 6 Warning: Playbook Not in Contract",
                message=f"Playbook {playbook.playbook_id} not explicitly in contract for {talent.name}",
                details={
                    "contract_playbooks": contract.assigned_playbook_ids,
                    "requested_playbook": playbook.playbook_id
                }
            )
        
        return GateExecutionResult(
            gate_type=GateType.CONTRACT_ENFORCEMENT,
            status=GateStatus.PASSED,
            message=f"Contract validated for {talent.name}",
            details={
                "contract_id": contract.id,
                "client_name": contract.client_name,
                "client_package": contract.client_package.value,
                "boundaries": contract.boundaries.model_dump()
            },
            next_gate=GateType.KPI_FEEDBACK
        ), alert
    
    # ==================== GATE 7: KPI FEEDBACK ====================
    
    def execute_gate_7_kpi_feedback(
        self,
        function: FunctionType,
        kpis: List[KPI],
        kpi_values: Dict[str, float],
        context: Dict[str, Any] = {}
    ) -> Tuple[GateExecutionResult, List[AlertCreate]]:
        """
        Gate 7: KPI Feedback Loop
        - Monitors KPIs for the function
        - Creates alerts for yellow/red status
        - Self-monitoring and learning
        """
        alerts = []
        kpi_statuses = []
        
        function_kpis = [kpi for kpi in kpis if kpi.function == function]
        
        for kpi in function_kpis:
            current_value = kpi_values.get(kpi.kpi_id)
            if current_value is None:
                continue
            
            thresholds = kpi.thresholds
            status = AlertStatus.GREEN
            
            if thresholds.is_higher_better:
                if current_value < thresholds.red_threshold:
                    status = AlertStatus.RED
                elif current_value < thresholds.yellow_threshold:
                    status = AlertStatus.YELLOW
            else:
                if current_value > thresholds.red_threshold:
                    status = AlertStatus.RED
                elif current_value > thresholds.yellow_threshold:
                    status = AlertStatus.YELLOW
            
            kpi_statuses.append({
                "kpi_id": kpi.kpi_id,
                "name": kpi.name,
                "current_value": current_value,
                "target": thresholds.target,
                "status": status.value,
                "unit": kpi.unit
            })
            
            if status in [AlertStatus.YELLOW, AlertStatus.RED]:
                alerts.append(AlertCreate(
                    alert_type="KPI_DRIFT",
                    severity=status,
                    function=function,
                    title=f"KPI Alert: {kpi.name}",
                    message=f"{kpi.name} is at {current_value}{kpi.unit} (target: {thresholds.target}{kpi.unit})",
                    details={
                        "kpi_id": kpi.kpi_id,
                        "current_value": current_value,
                        "target": thresholds.target,
                        "yellow_threshold": thresholds.yellow_threshold,
                        "red_threshold": thresholds.red_threshold,
                        "deviation": abs(current_value - thresholds.target)
                    }
                ))
        
        # Determine overall status
        has_red = any(s["status"] == "RED" for s in kpi_statuses)
        has_yellow = any(s["status"] == "YELLOW" for s in kpi_statuses)
        
        overall_status = GateStatus.PASSED
        message = "All KPIs within target"
        
        if has_red:
            overall_status = GateStatus.BLOCKED
            message = "Critical KPI drift detected - review required"
        elif has_yellow:
            message = "Some KPIs showing drift - monitoring"
        
        return GateExecutionResult(
            gate_type=GateType.KPI_FEEDBACK,
            status=overall_status,
            message=message,
            details={
                "function": function.value,
                "kpi_statuses": kpi_statuses,
                "green_count": sum(1 for s in kpi_statuses if s["status"] == "GREEN"),
                "yellow_count": sum(1 for s in kpi_statuses if s["status"] == "YELLOW"),
                "red_count": sum(1 for s in kpi_statuses if s["status"] == "RED")
            }
        ), alerts
    
    # ==================== UTILITY METHODS ====================
    
    def calculate_talent_tier(self, competency_scores: Dict[str, float]) -> Tuple[int, float]:
        """
        Calculate tier from competency scores
        - 1.0-2.0 → Tier 1
        - 2.1-3.5 → Tier 2
        - 3.6-5.0 → Tier 3
        """
        values = list(competency_scores.values())
        if not values:
            return 1, 1.0
        
        avg = sum(values) / len(values)
        
        if avg <= 2.0:
            tier = 1
        elif avg <= 3.5:
            tier = 2
        else:
            tier = 3
        
        return tier, round(avg, 2)
    
    def get_available_playbooks_for_tier(
        self,
        tier: int,
        playbooks: List[Playbook],
        function: Optional[FunctionType] = None,
        level: Optional[LevelType] = None
    ) -> List[Playbook]:
        """Get playbooks that a talent of given tier can execute"""
        filtered = []
        for pb in playbooks:
            if pb.min_tier <= tier and pb.is_active:
                if function and pb.function != function:
                    continue
                if level and pb.level != level:
                    continue
                filtered.append(pb)
        return filtered
    
    def create_gate_log(
        self,
        result: GateExecutionResult,
        talent_id: Optional[str] = None,
        playbook_id: Optional[str] = None,
        request_context: Dict[str, Any] = {},
        executed_by: Optional[str] = None
    ) -> GateLog:
        """Create audit log for gate execution"""
        return GateLog(
            gate_type=result.gate_type,
            status=result.status,
            talent_id=talent_id,
            playbook_id=playbook_id,
            request_context=request_context,
            result_details=result.details,
            message=result.message,
            executed_by=executed_by
        )


# Singleton instance
gate_engine = LabyrinthGateEngine()

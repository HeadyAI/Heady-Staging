# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Heady Project: Vampire Audit - Energy Leak Detection System      ║
# ║  "Identify and Eliminate Cognitive Energy Drains"                ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

param(
    [switch]$Interactive,
    [string]$OutputPath = "$env:USERPROFILE\Documents\HeadyLogs"
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  HEADY PROJECT VAMPIRE AUDIT                                 ║" -ForegroundColor Cyan
Write-Host "║  Energy Leak Detection and Elimination System               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Energy Budget Theory
Write-Host "ENERGY BUDGET THEORY:" -ForegroundColor Yellow
Write-Host "Assume 100 units of 'Directed Thought' per day:" -ForegroundColor White
Write-Host "  • 2 units per annoyance/notification" -ForegroundColor Gray
Write-Host "  • 5 units per past mistake rumination" -ForegroundColor Gray
Write-Host "  • 10 units per zombie relationship" -ForegroundColor Gray
Write-Host "  • Result: Energy bankruptcy before real work" -ForegroundColor Red
Write-Host ""

# Create output directory
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$AuditDate = Get-Date -Format "yyyy-MM-dd"
$AuditFile = Join-Path $OutputPath "Vampire-Audit-$AuditDate.md"

# Vampire Categories and Detection Questions
$VampireCategories = @{
    "OpenLoops" = @{
        "Name" = "Open Loops"
        "Description" = "Unfinished tasks that create mental background noise"
        "Symptoms" = @("Mental to-do lists running in background", "Switching between unfinished tasks", "Feeling scattered")
        "DetectionQuestions" = @(
            "What tasks did I start but not complete this week?",
            "What commitments are hanging unresolved?",
            "What decisions am I postponing?"
        )
        "EnergyCost" = 5
        "KillSwitch" = "Schedule it or Delete it"
    }
    
    "ZombieRelationships" = @{
        "Name" = "Zombie Relationships"
        "Description" = "Interactions requiring maintenance but yielding no growth"
        "Symptoms" = @("Feeling drained after interactions", "One-sided conversations", "Obligatory social events")
        "DetectionQuestions" = @(
            "Who am I maintaining contact with out of obligation?",
            "Which relationships require energy but give nothing back?",
            "What social commitments feel like chores?"
        )
        "EnergyCost" = 10
        "KillSwitch" = "Distance or Conclude"
    }
    
    "PhantomProcesses" = @{
        "Name" = "Phantom Processes"
        "Description" = "Worrying about things already decided for 'no interaction'"
        "Symptoms" = @("Replaying past conversations", "Worrying about uncontrollable events", "News addiction")
        "DetectionQuestions" = @(
            "What am I thinking about that I already decided not to change?",
            "What external events am I obsessing over?",
            "What past decisions am I second-guessing?")
        )
        "EnergyCost" = 2
        "KillSwitch" = "Re-assert 'No Interaction' command"
    }
    
    "DigitalVampires" = @{
        "Name" = "Digital Vampires"
        "Description" = "Technology and notifications that steal attention"
        "Symptoms" = @("Constant phone checking", "Email addiction", "Social media scrolling")
        "DetectionQuestions" = @(
            "Which apps/notifications interrupt my focus?",
            "What digital habits consume time without value?",
            "Which online activities leave me feeling drained?")
        )
        "EnergyCost" = 3
        "KillSwitch" = "Disable notifications, Set app limits, Delete apps"
    }
    
    "FutureAnxiety" = @{
        "Name" = "Future Anxiety"
        "Description" = "Worrying about hypothetical future scenarios"
        "Symptoms" = @(" Catastrophizing", "Planning for every possibility", "Fear-based decision making")
        "DetectionQuestions" = @(
            "What future scenarios am I obsessing over?",
            "What am I preparing for that may never happen?",
            "What decisions am I avoiding due to future fears?")
        )
        "EnergyCost" = 8
        "KillSwitch" = "Focus on present moment, Accept uncertainty"
    }
}

# Interactive Audit
$TotalEnergyLeak = 0
$IdentifiedVampires = @()

if ($Interactive) {
    Write-Host "INTERACTIVE VAMPIRE AUDIT" -ForegroundColor Yellow
    Write-Host "========================" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($Category in $VampireCategories.GetEnumerator()) {
        Write-Host "AUDITING: $($Category.Value.Name)" -ForegroundColor White
        Write-Host "Description: $($Category.Value.Description)" -ForegroundColor Gray
        Write-Host "Energy Cost per instance: $($Category.Value.EnergyCost) units" -ForegroundColor Red
        Write-Host ""
        
        $CategoryVampires = @()
        
        foreach ($Question in $Category.Value.DetectionQuestions) {
            Write-Host "Q: $Question" -ForegroundColor Cyan
            $Response = Read-Host "A (Enter to skip, or describe the vampire)"
            
            if ($Response -and $Response.Trim() -ne "") {
                $CategoryVampires += @{
                    "Trigger" = $Question
                    "Description" = $Response.Trim()
                    "EnergyCost" = $Category.Value.EnergyCost
                }
                $TotalEnergyLeak += $Category.Value.EnergyCost
            }
        }
        
        if ($CategoryVampires.Count -gt 0) {
            $IdentifiedVampires += @{
                "Category" = $Category.Value.Name
                "Vampires" = $CategoryVampires
                "KillSwitch" = $Category.Value.KillSwitch
            }
            Write-Host "Found $($CategoryVampires.Count) vampires in this category" -ForegroundColor Yellow
        } else {
            Write-Host "No vampires detected in this category" -ForegroundColor Green
        }
        
        Write-Host "Kill Switch: $($Category.Value.KillSwitch)" -ForegroundColor Magenta
        Write-Host ""
        Write-Host "Press Enter to continue to next category..."
        Read-Host
        Clear-Host
    }
} else {
    Write-Host "AUTOMATED VAMPIRE AUDIT" -ForegroundColor Yellow
    Write-Host "========================" -ForegroundColor Yellow
    Write-Host "Use -Interactive flag for detailed analysis" -ForegroundColor Gray
    Write-Host ""
    
    # Generate template for manual filling
    foreach ($Category in $VampireCategories.GetEnumerator()) {
        $IdentifiedVampires += @{
            "Category" = $Category.Value.Name
            "Vampires" = @(
                @{
                    "Trigger" = "Template - Fill in manually"
                    "Description" = "Description needed"
                    "EnergyCost" = $Category.Value.EnergyCost
                }
            )
            "KillSwitch" = $Category.Value.KillSwitch
        }
        $TotalEnergyLeak += $Category.Value.EnergyCost
    }
}

# Generate Audit Report
$AuditReport = @"
# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Heady Project Vampire Audit Report                           ║
# ║  Date: $AuditDate                                         ║
# ║  Total Energy Leak: $TotalEnergyLeak units/day               ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

## EXECUTIVE SUMMARY

**Total Daily Energy Budget**: 100 units
**Identified Energy Leaks**: $TotalEnergyLeak units
**Available for Productive Work**: $(100 - $TotalEnergyLeak) units

**Energy Efficiency**: $([math]::Round((100 - $TotalEnergyLeak), 2))%

---

## VAMPIRE IDENTIFIED

"@

foreach ($VampireGroup in $IdentifiedVampires) {
    $AuditReport += @"

### $($VampireGroup.Category)
**Kill Switch**: $($VampireGroup.KillSwitch)
**Energy Cost**: $(($VampireGroup.Vampires | Measure-Object -Property EnergyCost -Sum).Sum) units total

| Trigger | Description | Energy Cost |
|---------|-------------|--------------|
"@
    
    foreach ($Vampire in $VampireGroup.Vampires) {
        $AuditReport += "| $($Vampire.Trigger) | $($Vampire.Description) | $($Vampire.EnergyCost) units |`n"
    }
}

$AuditReport += @"

---

## ENERGY RECLAMATION PLAN

### Immediate Actions (Today)
1. **Highest Priority Vampire**: $(($IdentifiedVampires | Sort-Object {($_.Vampires | Measure-Object -Property EnergyCost -Sum).Sum} -Descending)[0].Category)
   - **Action**: $(($IdentifiedVampires | Sort-Object {($_.Vampires | Measure-Object -Property EnergyCost -Sum).Sum} -Descending)[0].KillSwitch)
   - **Energy Savings**: $(($IdentifiedVampires | Sort-Object {($_.Vampires | Measure-Object -Property EnergyCost -Sum).Sum} -Descending)[0].Vampires.EnergyCost) units/day

### This Week
1. Apply kill switches to all identified vampires
2. Monitor energy levels daily
3. Identify any new vampires that emerge

### Ongoing Maintenance
1. Weekly vampire audits (Sunday evenings)
2. Monthly energy budget review
3. Quarterly vampire pattern analysis

---

## RECOVERY PROJECTION

**Current Daily Available Energy**: $(100 - $TotalEnergyLeak) units
**After Eliminating All Vampires**: 100 units
**Energy Increase**: $TotalEnergyLeak units/day
**Weekly Energy Recovery**: $($TotalEnergyLeak * 7) units

This additional energy can be redirected to:
- High-magnitude reality changes
- Deep rendering sessions
- Creative projects
- Strategic planning

---

## PREVENTION STRATEGIES

### Input Filtering
- Practice immediate "Status Quo" classification
- Use daily log to track filtering decisions
- Develop intuition for energy-draining inputs

### Relationship Management
- Set clear boundaries with zombie relationships
- Schedule limited time for necessary maintenance
- Cultivate energy-giving connections

### Digital Hygiene
- Turn off non-essential notifications
- Use app blockers during rendering sessions
- Practice single-tasking

### Future Anxiety Management
- Focus on present-moment decisions
- Accept uncertainty as natural state
- Use simulation sandbox for future planning

---

## SUCCESS METRICS

### Weekly Tracking
- [ ] Energy leak reduction percentage
- [ ] Number of high-magnitude actions completed
- [ ] Clarity and calm levels (1-10 scale)
- [ ] Reality change magnitude achieved

### Monthly Review
- [ ] Total energy reclaimed
- [ ] New vampire patterns identified
- [ ] Prevention strategy effectiveness
- [ ] Overall life satisfaction improvement

---

## NOTES & INSIGHTS

*Space for personal reflections and insights discovered during the audit*

---

## SIGNATURE

*"Energy is your most precious resource. Protect it fiercely, spend it wisely, and watch your reality transform."*

Audit Completed: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Next Audit: $((Get-Date).AddDays(7).ToString("yyyy-MM-dd"))
"@

# Write audit report
Set-Content -Path $AuditFile -Value $AuditReport -NoNewline

Write-Host "Vampire Audit Complete!" -ForegroundColor Green
Write-Host "Report saved: $AuditFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "ENERGY BUDGET SUMMARY:" -ForegroundColor Yellow
Write-Host "  Total Budget: 100 units/day" -ForegroundColor White
Write-Host "  Energy Leaks: $TotalEnergyLeak units/day" -ForegroundColor Red
Write-Host "  Available for Work: $(100 - $TotalEnergyLeak) units/day" -ForegroundColor Green
Write-Host ""
Write-Host "IMMEDIATE ACTION REQUIRED:" -ForegroundColor Red
Write-Host "  1. Review the audit report" -ForegroundColor White
Write-Host "  2. Apply kill switches to identified vampires" -ForegroundColor White
Write-Host "  3. Monitor energy levels daily" -ForegroundColor White
Write-Host "  4. Schedule next audit for 1 week from today" -ForegroundColor White

if ($Interactive) {
    Write-Host ""
    $OpenReport = Read-Host "Open the audit report now? (y/n)"
    if ($OpenReport -eq 'y') {
        Start-Process $AuditFile
    }
}

Write-Host ""
Write-Host "Remember: Every unit of energy reclaimed is a unit of reality-shaping power gained." -ForegroundColor Magenta

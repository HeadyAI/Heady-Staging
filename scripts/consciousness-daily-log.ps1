# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Heady Project: Daily Consciousness Physics Log Generator        ║
# ║  "Automated Daily Manifest for Energy Allocation Tracking"      ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

param(
    [string]$Date = (Get-Date -Format "yyyy-MM-dd"),
    [string]$OutputPath = "$env:USERPROFILE\Documents\HeadyLogs"
)

$ErrorActionPreference = "Stop"

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$LogFile = Join-Path $OutputPath "Heady-Daily-$Date.md"

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  HEADY PROJECT DAILY LOG GENERATOR                           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Generate daily log template
$LogTemplate = @"
# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Heady Project Daily Manifest                                   ║
# ║  Date: $Date                                              ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

## CURRENT ENERGY STATE
[ ] Low (Scatter)    [ ] Medium (Stable)    [ ] High (Directed)

---

## PART A: THE FILTER (The 99%)
*List 3 things entering awareness that will NOT receive interaction today*
(Command: "Status Quo Maintained. Zero Joules Allocated.")

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

---

## PART B: ACTIVE PROJECTS (The 1%)

### PROJECT 1: _______________________________________________________
- **Current Snapshot Resolution**: [ ] Low (Blurry)  [ ] High (Clear)
- **Energy Signature**: [ ] Anxiety/Rush  [ ] Clarity/Calm
- **ACTION**: [ ] Wait/Render (Go to Sandbox)   [ ] Execute (Pulse)

### PROJECT 2: _______________________________________________________
- **Current Snapshot Resolution**: [ ] Low (Blurry)  [ ] High (Clear)
- **Energy Signature**: [ ] Anxiety/Rush  [ ] Clarity/Calm
- **ACTION**: [ ] Wait/Render (Go to Sandbox)   [ ] Execute (Pulse)

### PROJECT 3: _______________________________________________________
- **Current Snapshot Resolution**: [ ] Low (Blurry)  [ ] High (Clear)
- **Energy Signature**: [ ] Anxiety/Rush  [ ] Clarity/Calm
- **ACTION**: [ ] Wait/Render (Go to Sandbox)   [ ] Execute (Pulse)

---

## PART C: SYSTEM ALERTS (Anxiety/Friction Check)

### Collision Error (Unexpected Change)
[ ] No
[ ] Yes → Description: __________________________________________
      → Adjustment: [ ] Update Snapshot   [ ] Abandon Project

### Resolution Error (Incomplete Snapshot)
[ ] No
[ ] Yes → Description: __________________________________________
      → Action: [ ] Continue Rendering   [ ] Recalculate

---

## PART D: RENDERING SESSIONS

### Sandbox Session 1
- **Project**: _________________________
- **Duration**: _____ minutes
- **Resolution Achieved**: [ ] No  [ ] Yes
- **Energy Signature**: [ ] Improved  [ ] Same  [ ] Degraded

### Sandbox Session 2
- **Project**: _________________________
- **Duration**: _____ minutes
- **Resolution Achieved**: [ ] No  [ ] Yes
- **Energy Signature**: [ ] Improved  [ ] Same  [ ] Degraded

---

## PART E: PULSE EXECUTIONS (High-Magnitude Actions)

### Action 1: _________________________________________________________
- **Time**: __________
- **Energy Level**: [ ] Low  [ ] Medium  [ ] High
- **Result**: [ ] Success  [ ] Partial  [ ] Failed
- **Reality Change Magnitude**: [ ] Minimal  [ ] Moderate  [ ] Significant

### Action 2: _________________________________________________________
- **Time**: __________
- **Energy Level**: [ ] Low  [ ] Medium  [ ] High
- **Result**: [ ] Success  [ ] Partial  [ ] Failed
- **Reality Change Magnitude**: [ ] Minimal  [ ] Moderate  [ ] Significant

---

## PART F: VAMPIRES IDENTIFIED

### Open Loops
1. _______________________________________________________________
2. _______________________________________________________________

### Zombie Relationships
1. _______________________________________________________________
2. _______________________________________________________________

### Phantom Processes
1. _______________________________________________________________
2. _______________________________________________________________

---

## PART G: ENERGY BUDGET ANALYSIS

### Total Directed Thought Units: 100
### Allocated to Status Quo: _____ units
### Allocated to Active Projects: _____ units
### Energy Leaks (Vampires): _____ units
### Available for Tomorrow: _____ units

---

## PART H: REFLECTIONS & INSIGHTS

### Key Successes Today
1. _______________________________________________________________
2. _______________________________________________________________

### Lessons Learned
1. _______________________________________________________________
2. _______________________________________________________________

### Tomorrow's Focus
1. _______________________________________________________________
2. _______________________________________________________________

---

## SIGNATURE
*Every split second moment is a decision about energy allocation. Choose wisely, render completely, execute violently.*

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

# Write log file
Set-Content -Path $LogFile -Value $LogTemplate -NoNewline

Write-Host "Daily log created: $LogFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Open the log file and fill in your daily entries" -ForegroundColor Cyan
Write-Host "  2. Use the checkboxes to track your energy state" -ForegroundColor Cyan
Write-Host "  3. Complete the Vampire Audit weekly" -ForegroundColor Cyan
Write-Host "  4. Review your patterns monthly" -ForegroundColor Cyan
Write-Host ""

# Optional: Open the file automatically
$OpenFile = Read-Host "Open the log file now? (y/n)"
if ($OpenFile -eq 'y') {
    Start-Process $LogFile
}

Write-Host "Heady Project Daily Log Generator Complete." -ForegroundColor Green

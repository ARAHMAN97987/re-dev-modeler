#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Haseef Overnight Tasks - Scheduler
# 10 tasks, starting 5 min from now, 45 min intervals
# Total runtime: ~7 hours
# ═══════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

echo "═══════════════════════════════════════════════"
echo "  Haseef Overnight Tasks Scheduler"
echo "  Tasks: 11 (1 test + 10 real)"
echo "  Interval: 45 minutes"
echo "  Start: NOW + 5 min"
echo "═══════════════════════════════════════════════"
echo ""

# ─── Task 0: Test (runs in 5 minutes) ───
TASKS=(
  "task_00_test.md:5"
  "task_01_security.md:50"
  "task_02_audit.md:95"
  "task_03_financial.md:140"
  "task_04_mobile.md:185"
  "task_05_asset_table.md:230"
  "task_06_empty_states.md:275"
  "task_07_cashflow.md:320"
  "task_08_ai_copilot.md:365"
  "task_09_ux_polish.md:410"
  "task_10_final.md:455"
)

for entry in "${TASKS[@]}"; do
  TASK_FILE="${entry%%:*}"
  DELAY_MIN="${entry##*:}"
  TASK_NAME="${TASK_FILE%.md}"
  
  echo "Scheduling: $TASK_NAME (in ${DELAY_MIN} min)"
  
  # Calculate delay in seconds
  DELAY_SEC=$((DELAY_MIN * 60))
  
  # Schedule with 'at' or use sleep-based approach
  (
    sleep $DELAY_SEC
    echo "[$(date)] Starting $TASK_NAME" >> "$LOG_DIR/scheduler.log"
    
    # Run Claude Code with the task prompt
    cd "$PROJECT_DIR"
    claude --yes "$SCRIPT_DIR/$TASK_FILE" > "$LOG_DIR/${TASK_NAME}.log" 2>&1
    
    echo "[$(date)] Finished $TASK_NAME (exit: $?)" >> "$LOG_DIR/scheduler.log"
  ) &
  
done

echo ""
echo "═══════════════════════════════════════════════"
echo "  All 11 tasks scheduled!"
echo ""
echo "  Timeline:"
echo "  Task 0  (Test):        +5 min"
echo "  Task 1  (Security):    +50 min"
echo "  Task 2  (Audit):       +1h 35m"
echo "  Task 3  (Financial):   +2h 20m"
echo "  Task 4  (Mobile):      +3h 5m"
echo "  Task 5  (Asset Table): +3h 50m"
echo "  Task 6  (Empty States):+4h 35m"
echo "  Task 7  (Cash Flow):   +5h 20m"
echo "  Task 8  (AI Copilot):  +6h 5m"
echo "  Task 9  (UX Polish):   +6h 50m"
echo "  Task 10 (Final):       +7h 35m"
echo ""
echo "  Logs: $LOG_DIR/"
echo "  Report: $PROJECT_DIR/docs/OVERNIGHT_FINAL_REPORT.md"
echo "═══════════════════════════════════════════════"
echo ""
echo "Keep this terminal open. Use 'caffeinate' to prevent sleep:"
echo "  caffeinate -i ./run_overnight.sh"

# Wait for all background jobs
wait
echo ""
echo "[$(date)] All tasks completed."

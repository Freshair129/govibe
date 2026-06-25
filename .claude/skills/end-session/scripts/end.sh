#!/usr/bin/env bash
# end-session: compose existing GoVibe conventions to close a working session atomically.
# See ../SKILL.md and ../references/conventions.md for the contract.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 99

# --- parse args ------------------------------------------------------------
agent=""; role=""; summary=""; session_id=""; todo=""; selfnote=""
handoff_to=""; task_id=""; priority="MEDIUM"
while [ $# -gt 0 ]; do
  case "$1" in
    --agent)       agent="$2"; shift 2 ;;
    --role)        role="$2"; shift 2 ;;
    --summary)     summary="$2"; shift 2 ;;
    --session-id)  session_id="$2"; shift 2 ;;
    --todo)        todo="$2"; shift 2 ;;
    --selfnote)    selfnote="$2"; shift 2 ;;
    --handoff-to)  handoff_to="$2"; shift 2 ;;
    --task-id)     task_id="$2"; shift 2 ;;
    --priority)    priority="$2"; shift 2 ;;
    -h|--help)
      sed -n '1,40p' "$(dirname "$0")/../SKILL.md"; exit 0 ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

[ -z "$agent" ]   && { echo "ERROR: --agent is required"; exit 1; }
[ -z "$summary" ] && { echo "ERROR: --summary is required"; exit 1; }
[ -z "$role" ] && role="$(echo "$agent" | tr '[:upper:]' '[:lower:]')"
case "$priority" in HIGH|MEDIUM|LOW) ;; *) echo "ERROR: --priority must be HIGH|MEDIUM|LOW"; exit 1 ;; esac

# --- derive identifiers ----------------------------------------------------
[ -z "$session_id" ] && session_id=$(node -e "console.log(require('crypto').randomUUID())")
iso=$(node -e "const d=new Date();const z=d.getTimezoneOffset();const s=z<=0?'+':'-';const p=n=>String(n).padStart(2,'0');const off=p(Math.abs(z/60|0))+':'+p(Math.abs(z%60));console.log(d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+'-'+p(d.getMinutes())+'-'+p(d.getSeconds())+s+off.replace(':','-'))")
end_ms=$(node -e "console.log(Date.now())")
ts_iso=$(node -e "const d=new Date();const z=d.getTimezoneOffset();const s=z<=0?'+':'-';const p=n=>String(n).padStart(2,'0');const off=p(Math.abs(z/60|0))+':'+p(Math.abs(z%60));console.log(d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+s+off)")

slug=$(printf '%s' "$summary" | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
  | awk -F'-' '{out=""; for(i=1;i<=NF && i<=8;i++){out=(i==1?$i:out"-"$i)} print out}' \
  | cut -c1-60)
[ -z "$slug" ] && slug="session"

# --- JSON helpers (node-backed, never breaks on quotes / newlines) --------
jq_json() { node -e "process.stdout.write(JSON.stringify(process.argv[1]))" -- "$1"; }

# --- 1) append session_end event -------------------------------------------
sl_dir=".agents/$role/session_logs"; mkdir -p "$sl_dir"
sl_file="$sl_dir/$session_id.jsonl"
{
  printf '{"type":"session_end","sessionId":%s,"endTime":%s,"agent":%s,"summary":%s}\n' \
    "$(jq_json "$session_id")" "$end_ms" "$(jq_json "$agent")" "$(jq_json "$summary")"
} >> "$sl_file"
echo "✓ session_logs: $sl_file"

# --- 2) append handoff (optional) ------------------------------------------
if [ -n "$handoff_to" ]; then
  ho_dir=".agents/$role/handoff"; mkdir -p "$ho_dir"
  ho_file="$ho_dir/log.jsonl"
  {
    printf '{"timestamp":%s,"from":%s,"to":%s,"task_id":%s,"status":"PENDING","priority":%s,"message":%s}\n' \
      "$(jq_json "$ts_iso")" "$(jq_json "$agent")" "$(jq_json "$handoff_to")" \
      "$(jq_json "${task_id:-}")" "$(jq_json "$priority")" "$(jq_json "$summary")"
  } >> "$ho_file"
  echo "✓ handoff:      $ho_file (to: $handoff_to)"
fi

# --- 3) TODO + 4) self-note + 5) session summary --------------------------
mem_dir=".brain/memory/$agent"; mkdir -p "$mem_dir"
sess_dir=".brain/session"; mkdir -p "$sess_dir"

write_md() {
  # $1 = path; $2 = title; $3 = body
  local path="$1" title="$2" body="$3"
  {
    printf '# %s\n' "$title"
    printf '**Agent:** %s   **Session:** %s   **Ended:** %s\n\n' "$agent" "$session_id" "$iso"
    printf '%s\n' "$body"
  } > "$path"
  echo "✓ wrote:        $path"
}

if [ -n "$todo" ];     then write_md "$mem_dir/TODO-SESSION-$iso-$slug.md"     "TODO — $slug" "$todo"; fi
if [ -n "$selfnote" ]; then write_md "$mem_dir/SELFNOTE-$iso-$slug.md"          "Self-note — $slug" "$selfnote"; fi

# session summary — always write
{
  printf '# Session: %s\n' "$slug"
  printf '**Date:** %s\n**Agent:** %s\n**Session ID:** %s\n\n' "$iso" "$agent" "$session_id"
  printf '## Summary\n%s\n\n' "$summary"
  printf '## Handoff\n- to: %s\n- task_id: %s\n- priority: %s\n' \
    "${handoff_to:-none}" "${task_id:-n/a}" "$priority"
} > "$sess_dir/SESSION-$iso-$slug.md"
echo "✓ wrote:        $sess_dir/SESSION-$iso-$slug.md"

echo ""
echo "end-session done — session_id=$session_id"

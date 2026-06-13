import fs from "node:fs/promises";
import path from "node:path";

async function validate() {
  const root = process.cwd();
  console.log("Validating Workspace against STD-Execution-Governance...");

  // 1. ตรวจสอบไฟล์มาตรฐาน
  const stdPath = path.join(root, "docs/STD-Execution-Governance.md");
  try {
    await fs.access(stdPath);
    console.log("[PASS] Found STD-Execution-Governance.md");
  } catch {
    console.error("[FAIL] STD-Execution-Governance.md not found! This is required.");
    process.exit(1);
  }

  // 2. ตรวจสอบโครงสร้างพื้นฐานตามมาตรฐาน (C-2 work)
  console.log("[INFO] Checking required artifacts for C-2 work...");
  const requiredPaths = ["docs/adr", "docs/features"];
  for (const p of requiredPaths) {
    try {
      await fs.access(path.join(root, p));
      console.log(`[PASS] Validating path: ${p}`);
    } catch {
      console.warn(`[WARN] Missing path: ${p} (อาจส่งผลต่อ traceability)`);
    }
  }

  console.log("\nValidation Complete. GoVibe Governance enforced.");
}

validate();

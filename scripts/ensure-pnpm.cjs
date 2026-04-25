const fs = require("fs");

for (const file of ["package-lock.json", "yarn.lock"]) {
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
  }
}

const ua = process.env.npm_config_user_agent || "";

if (!ua.startsWith("pnpm/")) {
  console.error("Use pnpm instead of npm or yarn.");
  process.exit(1);
}

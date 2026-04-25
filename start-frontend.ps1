cd C:\Users\admin1\Desktop\Dasturlar2\Fleet-Manager-Pro

$env:PORT="8081"
$env:BASE_PATH="/"

pnpm --filter @workspace/fleet-docs exec vite --config vite.config.ts --host 0.0.0.0 --force

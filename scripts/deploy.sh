#!/usr/bin/env bash
set -euo pipefail

# Load local .env if present
if [ -f "${PROJECT_ROOT:-.}/.env" ]; then
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT:-.}/.env"
fi

# Configuration
TV_IP="${TV_IP:-10.10.201.52}"
TV_PORT="${TV_PORT:-26101}"
SERIAL="${TV_IP}:${TV_PORT}"
APP_ID="nClrkHome1.FrameHome"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${PROJECT_ROOT}/app"
DIST_DIR="${PROJECT_ROOT}/dist/signed"
TIZEN_CLI="${TIZEN_CLI:-/tmp/tizen_cli/data/tools/ide/bin/tizen.sh}"
SDB="${SDB:-$(which sdb 2>/dev/null || echo "${HOME}/.local/bin/sdb")}"

mkdir -p "${DIST_DIR}"

echo "==> Packaging CleanFrame..."
# Pass profile FrameHome (if automated stdin is needed, send credentials)
if command -v expect >/dev/null 2>&1; then
  expect -c "
    spawn \"${TIZEN_CLI}\" package -t wgt -s FrameHome -o \"${DIST_DIR}\" -- \"${APP_DIR}\"
    expect \"Author password:\" { send \"CleanFrame123\r\" }
    expect \"Save author password*\" { send \"Y\r\" }
    expect \"Distributor1 password:\" { send \"CleanFrame123\r\" }
    expect \"Save distributor1 password*\" { send \"Y\r\" }
    expect eof
  "
else
  "${TIZEN_CLI}" package -t wgt -s FrameHome -o "${DIST_DIR}" -- "${APP_DIR}"
fi

PACKAGE_FILE="${DIST_DIR}/CleanFrame.wgt"
if [ ! -f "${PACKAGE_FILE}" ]; then
  echo "Error: Package file ${PACKAGE_FILE} not found." >&2
  exit 1
fi

echo "==> Connecting to TV at ${SERIAL}..."
"${SDB}" connect "${SERIAL}" || true

echo "==> Pushing package to TV..."
"${SDB}" -s "${SERIAL}" push "${PACKAGE_FILE}" "/home/owner/share/tmp/sdk_tools/CleanFrame-deploy.wgt"

echo "==> Installing package on TV..."
"${SDB}" -s "${SERIAL}" shell 0 vd_appinstall "${APP_ID}" "/home/owner/share/tmp/sdk_tools/CleanFrame-deploy.wgt"

echo "==> Launching CleanFrame..."
"${SDB}" -s "${SERIAL}" shell 0 execute "${APP_ID}"

echo "==> Done! CleanFrame is running on ${TV_IP}."

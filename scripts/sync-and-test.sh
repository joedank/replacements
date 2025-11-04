#!/usr/bin/env bash

set -euo pipefail

REPO_URL="<REPO_URL_GOES_HERE>"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_TARGET="$(cd "${SCRIPT_DIR}/.." && pwd)"

FORCE_RESET=0
ALLOW_NON_FF=0
AUTO_LATEST_CLAUDE=0
TARGET_DIR=""
MERGE_BRANCH=""
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE_RESET=1
      shift
      ;;
    --merge-branch)
      if [[ $# -lt 2 ]]; then
        echo "Error: --merge-branch requires a branch name" >&2
        exit 1
      fi
      MERGE_BRANCH="$2"
      shift 2
      ;;
    --merge-latest-claude)
      AUTO_LATEST_CLAUDE=1
      shift
      ;;
    --allow-non-ff)
      ALLOW_NON_FF=1
      shift
      ;;
    --target)
      if [[ $# -lt 2 ]]; then
        echo "Error: --target requires a directory path" >&2
        exit 1
      fi
      TARGET_DIR="$2"
      shift 2
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        POSITIONAL+=("$1")
        shift
      done
      break
      ;;
    -*)
      echo "Error: Unknown option $1" >&2
      exit 1
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

# Handle positional arguments as target directory
if [[ -n "${TARGET_DIR}" && ${#POSITIONAL[@]} -gt 0 ]]; then
  echo "Error: target directory specified multiple times" >&2
  exit 1
fi

if [[ -z "${TARGET_DIR}" ]]; then
  if [[ ${#POSITIONAL[@]} -eq 1 ]]; then
    TARGET_DIR="${POSITIONAL[0]}"
  elif [[ ${#POSITIONAL[@]} -gt 1 ]]; then
    echo "Error: multiple target directories provided" >&2
    exit 1
  else
    TARGET_DIR="${DEFAULT_TARGET}"
  fi
fi

# Validate conflicting merge options
if [[ ${AUTO_LATEST_CLAUDE} -eq 1 && -n "${MERGE_BRANCH}" ]]; then
  echo "Error: --merge-branch and --merge-latest-claude cannot be used together" >&2
  exit 1
fi

echo ">>> Target directory: ${TARGET_DIR}"

if [[ ! -d "${TARGET_DIR}" ]]; then
  echo "Error: target directory '${TARGET_DIR}' does not exist" >&2
  exit 1
fi

cd "${TARGET_DIR}"

if [[ ! -d .git ]]; then
  echo "Error: ${TARGET_DIR} is not a git repository" >&2
  exit 1
fi

# Verify origin points to correct URL
REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
if [[ "${REMOTE_URL}" != "${REPO_URL}" ]]; then
  echo "Error: origin remote is '${REMOTE_URL}', expected '${REPO_URL}'" >&2
  echo "       Update the remote or use --target to specify another directory" >&2
  exit 1
fi

echo ">>> Fetching latest changes..."
git fetch --all --prune

# Check current branch
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "main" ]]; then
  if [[ ${FORCE_RESET} -eq 1 ]]; then
    echo ">>> Switching to main branch (was '${CURRENT_BRANCH}')..."
    git checkout main
  else
    echo "Error: currently on branch '${CURRENT_BRANCH}'. Switch to 'main' or rerun with --force" >&2
    exit 1
  fi
fi

# Check working tree status
if [[ -n "$(git status --porcelain)" ]]; then
  if [[ ${FORCE_RESET} -eq 1 ]]; then
    echo ">>> Working tree dirty. Resetting to origin/main..."
    git reset --hard origin/main
    git clean -fd
  else
    echo "Error: working tree has uncommitted changes. Commit or stash them first, or rerun with --force to discard" >&2
    exit 1
  fi
else
  echo ">>> Working tree clean. Fast-forwarding main..."
  git pull --ff-only origin main
fi

# Handle --merge-latest-claude
if [[ ${AUTO_LATEST_CLAUDE} -eq 1 ]]; then
  MERGE_BRANCH="$(git for-each-ref --sort=-committerdate --count=1 --format='%(refname:strip=3)' 'refs/remotes/origin/claude/' || true)"
  if [[ -z "${MERGE_BRANCH}" ]]; then
    echo "Error: --merge-latest-claude requested but no origin/claude/* branches found" >&2
    exit 1
  fi
  echo ">>> Latest Claude branch detected: ${MERGE_BRANCH}"
fi

# Handle branch merging
if [[ -n "${MERGE_BRANCH}" ]]; then
  if ! git show-ref --verify --quiet "refs/remotes/origin/${MERGE_BRANCH}"; then
    echo "Error: origin/${MERGE_BRANCH} does not exist" >&2
    exit 1
  fi

  echo ">>> Merging origin/${MERGE_BRANCH} into main..."
  if [[ ${ALLOW_NON_FF} -eq 1 ]]; then
    git merge --no-ff "origin/${MERGE_BRANCH}"
  else
    if ! git merge --ff-only "origin/${MERGE_BRANCH}"; then
      echo "Error: fast-forward merge from origin/${MERGE_BRANCH} failed" >&2
      echo "       Rerun with --allow-non-ff to permit a merge commit" >&2
      exit 1
    fi
  fi

  echo ">>> Pushing main to origin..."
  git push origin main
fi

echo ">>> Installing npm dependencies..."
npm install

echo ">>> Running build..."
./universal_build.sh --release

echo ">>> Done. Repository synced and build finished."
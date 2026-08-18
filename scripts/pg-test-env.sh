#!/usr/bin/env bash
#
# DB-PG-12: isolated PostgreSQL integration environment.
# Starts a throwaway local cluster (initdb + pg_ctl) on a fixed test port,
# creates the solarch_test database, exports PG_TEST_CONNECTION_STRING,
# runs the given command, and destroys the cluster on exit.
#
# Usage: bash scripts/pg-test-env.sh <command...>
# Example: bash scripts/pg-test-env.sh npx vitest run src/tools/database/contracts/postgres.contract.test.ts
#
# Requirements: initdb, pg_ctl, createdb, psql on PATH (Homebrew postgresql@17).

set -euo pipefail

if ! command -v initdb >/dev/null 2>&1 || ! command -v pg_ctl >/dev/null 2>&1; then
  echo "error: initdb/pg_ctl not found on PATH. Install PostgreSQL (brew install postgresql@17)." >&2
  exit 1
fi

DATA_DIR=$(mktemp -d /tmp/solarch-pgtest.XXXXXX)
PORT=${PG_TEST_PORT:-55432}

cleanup() {
  pg_ctl -D "$DATA_DIR" stop -m fast >/dev/null 2>&1 || true
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

initdb -D "$DATA_DIR" -U postgres --auth=trust --no-locale >/dev/null
pg_ctl -D "$DATA_DIR" -o "-p $PORT -k $DATA_DIR -h 127.0.0.1" -l "$DATA_DIR/pg.log" start >/dev/null
createdb -h 127.0.0.1 -p "$PORT" -U postgres solarch_test

export PG_TEST_CONNECTION_STRING="postgres://postgres@127.0.0.1:$PORT/solarch_test"
export PG_TEST_PORT="$PORT"

echo "pg-test-env: cluster up on port $PORT (data: $DATA_DIR)"
"$@"
echo "pg-test-env: command finished, tearing down cluster"
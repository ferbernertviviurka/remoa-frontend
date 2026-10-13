#!/usr/bin/env bash
# G27 QA: recreate the isolated DB (remoa_f33_test_g27qa) and the harness API on :4361 (own PID only).
set -e
B=/Users/fernandoviviurka/Desktop/Projetos/remoa/remoa-backend
PID=$(lsof -ti tcp:4361 || true); [ -n "$PID" ] && curl -s -XPOST 127.0.0.1:4361/__test/finish >/dev/null; for i in 1 2 3 4 5 6 7 8; do lsof -ti tcp:4361 >/dev/null || break; sleep 1; done
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -qc "drop database if exists remoa_f33_test_g27qa" -c "select 1" >/dev/null
(cd $B && ./scripts/f33-test-db.sh remoa_f33_test_g27qa | tail -1)
(cd $B/apps/api && nohup node src/questions/e2e-harness/start-g27.mjs /private/tmp/remoa-g27qa-url > /private/tmp/g27qa-api.log 2>&1 &)
for i in $(seq 1 60); do curl -s 127.0.0.1:4361/__test/meta >/dev/null && break; sleep 2; done
lsof -ti tcp:4361

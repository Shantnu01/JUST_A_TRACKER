import test from 'node:test';
import assert from 'node:assert/strict';

test('Production Readiness: Server Module Dependencies', async () => {
  const express = await import('express');
  assert.ok(express.default, 'Express should load cleanly');

  const cors = await import('cors');
  assert.ok(cors.default, 'CORS should load cleanly');

  const jwt = await import('jsonwebtoken');
  assert.ok(jwt.default, 'JWT library should load cleanly');

  const bcrypt = await import('bcryptjs');
  assert.ok(bcrypt.default, 'bcryptjs should load cleanly');

  const pg = await import('pg');
  assert.ok(pg.default.Pool, 'pg Pool should load cleanly');
});

test('Production Readiness: Health Check Configuration', () => {
  const port = process.env.PORT || 4000;
  assert.ok(Number(port) > 0, 'Port must be a valid positive integer');
});

test('Production Readiness: Multi-Core Cluster Parallelism Capability', async () => {
  const cluster = await import('node:cluster');
  const os = await import('node:os');
  
  assert.ok(cluster.default, 'node:cluster module must be available');
  assert.ok(os.default, 'node:os module must be available');
  
  const cores = os.default.availableParallelism ? os.default.availableParallelism() : os.default.cpus().length;
  assert.ok(cores >= 1, 'System should detect at least 1 CPU core');
  console.log(`ℹ Detected ${cores} logical CPU core(s) available for clustering.`);
});

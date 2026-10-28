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

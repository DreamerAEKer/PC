import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPhoneValue } from '../src/utils/contact.js';

test('treats missing or whitespace-only phone numbers as absent', () => {
  assert.equal(hasPhoneValue(undefined), false);
  assert.equal(hasPhoneValue('   '), false);
});

test('keeps a supplied phone number printable', () => {
  assert.equal(hasPhoneValue('081-234-5678'), true);
});

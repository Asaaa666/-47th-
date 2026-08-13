import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearchQuery } from './src/searchUtils.js';

test('matchesSearchQuery accepts valid partial matches', () => {
  const group = {
    name: '生物部',
    description: '植物や昆虫を展示します。',
    category: '展示',
    location: '生物特別教室',
    comment: '今日は混んでいます',
  };

  assert.equal(matchesSearchQuery(group, '生物'), true);
  assert.equal(matchesSearchQuery(group, '生物 部'), true);
  assert.equal(matchesSearchQuery(group, '生物特別教室'), true);
  assert.equal(matchesSearchQuery(group, '混んでいます'), true);
});

test('matchesSearchQuery rejects unrelated text', () => {
  const group = {
    name: '図書研究部',
    description: '古本を販売しています。',
    category: '展示',
    location: '本校舎教室',
    comment: '静かに閲覧できます',
  };

  assert.equal(matchesSearchQuery(group, '生物さわ'), false);
  assert.equal(matchesSearchQuery(group, 'テスト'), false);
  assert.equal(matchesSearchQuery(group, 'ランダム検索'), false);
});

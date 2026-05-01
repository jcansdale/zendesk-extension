const assert = require('assert');

function parseRemainingQuery(query) {
  const valuePattern = '(?:"[^"]*"|\'[^\']*\'|\\S+)';
  const customFieldNegatedPattern = new RegExp(`-custom_field_(\\d+):(${valuePattern})`, 'gi');
  const customFieldPattern = new RegExp(`(?<!-)\\bcustom_field_(\\d+):(${valuePattern})`, 'gi');

  let remainingQuery = query;

  const customNegatedMatches = [...query.matchAll(customFieldNegatedPattern)];
  const customMatches = [...query.matchAll(customFieldPattern)];

  customNegatedMatches.forEach((match) => {
    remainingQuery = remainingQuery.replace(match[0], '');
  });

  customMatches.forEach((match) => {
    remainingQuery = remainingQuery.replace(match[0], '');
  });

  return remainingQuery.trim().replace(/\s+/g, ' ');
}

// Regression: negated custom fields should not leave stray '-'.
{
  const query =
    'status:new -custom_field_360026997452:cat_copilot* custom_field_360036968551:squad_worktent';
  const remaining = parseRemainingQuery(query);
  assert.strictEqual(remaining, 'status:new');
}

// Ensure positive custom fields preceded by '-' are not matched by the positive regex.
{
  const query = '-custom_field_1:abc';
  const remaining = parseRemainingQuery(query);
  assert.strictEqual(remaining, '');
}

console.log('popup.parseQuery.test.js passed');


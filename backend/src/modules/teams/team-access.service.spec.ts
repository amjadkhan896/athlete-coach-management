import { activeOn } from './team-access.service';

describe('activeOn', () => {
  it('builds a half-open date range predicate', () => {
    expect(activeOn('$1')).toBe('valid_from <= $1::date AND (valid_to IS NULL OR valid_to > $1::date)');
  });

  it('qualifies every column with the alias', () => {
    expect(activeOn('$2', 'a.')).toBe(
      'a.valid_from <= $2::date AND (a.valid_to IS NULL OR a.valid_to > $2::date)',
    );
  });
});

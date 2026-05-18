export type PwdRules = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  special: boolean;
};

export function checkPassword(pwd: string): PwdRules {
  return {
    length: pwd.length >= 8,
    lower: /[a-z]/.test(pwd),
    upper: /[A-Z]/.test(pwd),
    special: /[^a-zA-Z0-9]/.test(pwd),
  };
}

export function allRulesMet(r: PwdRules) {
  return r.length && r.lower && r.upper && r.special;
}
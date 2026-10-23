// Detection returns a boolean only: never include the matched credential in output.
export function containsSecret(text) {
  const rules = [/sb_secret_[A-Za-z0-9_-]{24,}/, /(?:ghp|github_pat)_[A-Za-z0-9_]{30,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/];
  if (rules.some((rule) => rule.test(text))) return true;
  return [...text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].some((match) => {
    try { return JSON.parse(Buffer.from(match[1], 'base64url').toString()).role === 'service_role'; } catch { return false; }
  });
}

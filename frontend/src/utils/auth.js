// Token management — stored in sessionStorage, never hardcoded
export function getToken() {
  return sessionStorage.getItem('heady_token') || null;
}

export function setToken(token) {
  if (token) sessionStorage.setItem('heady_token', token);
  else sessionStorage.removeItem('heady_token');
}

export function isAuthenticated() {
  return !!getToken();
}

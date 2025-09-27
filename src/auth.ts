import { ApiKeyAuth, AuthStrategy, DynamicAuth, IncomingLike, JwtAuth, KeycloakAuth, NoneAuth } from './types.js';

export const auth = {
  none(): NoneAuth { return { mode: 'none' }; },
  apiKey(opts: Omit<ApiKeyAuth, 'mode'>): ApiKeyAuth { return { mode: 'apikey', headerName: 'X-API-Key', ...opts }; },
  jwt(opts: Omit<JwtAuth, 'mode'>): JwtAuth { return { mode: 'jwt', headerName: 'Authorization', requireBearer: true, algorithms: ['HS256'], ...opts }; },
  keycloak(opts: Omit<KeycloakAuth, 'mode'>): KeycloakAuth { return { mode: 'keycloak', headerName: 'Authorization', requireBearer: true, algorithms: ['RS256'], leeway: 60, ...opts }; },
  dynamic(provider: (req: IncomingLike) => AuthStrategy): DynamicAuth { return { mode: 'dynamic', provider }; }
};


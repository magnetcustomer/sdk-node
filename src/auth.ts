import axios, { AxiosInstance } from 'axios';

export const DEFAULT_TOKEN_URL = 'https://magnetcustomer.net/realms/platform/protocol/openid-connect/token';

/** Folga, em segundos, para renovar o token antes de ele vencer. */
const RENEWAL_MARGIN_SECONDS = 60;

export interface ServiceAccountCredentials {
    clientId: string;
    clientSecret: string;
    /** Endereço do token. Só mude em ambientes de teste. */
    tokenUrl?: string;
}

interface CachedToken {
    accessToken: string;
    expiresAt: number;
}

/**
 * Obtém e renova o token de um Service Account (OAuth 2.0 client_credentials).
 * O fluxo não tem refresh token: quando o token está perto de vencer, um novo é pedido.
 */
export class TokenManager {
    private cached: CachedToken | null = null;
    private pending: Promise<string> | null = null;

    constructor(
        private readonly credentials: ServiceAccountCredentials,
        private readonly http: AxiosInstance = axios.create(),
        private readonly now: () => number = Date.now,
    ) {
        if (!credentials.clientId || !credentials.clientSecret) {
            throw new Error('clientId e clientSecret são obrigatórios.');
        }
    }

    /** Devolve um token válido, pedindo um novo só quando necessário. */
    async getAccessToken(): Promise<string> {
        if (this.cached && this.cached.expiresAt > this.now()) {
            return this.cached.accessToken;
        }
        // Chamadas simultâneas compartilham o mesmo pedido de token.
        if (!this.pending) {
            this.pending = this.requestToken().finally(() => {
                this.pending = null;
            });
        }
        return this.pending;
    }

    /** Descarta o token guardado. Use ao receber 401. */
    invalidate(): void {
        this.cached = null;
    }

    private async requestToken(): Promise<string> {
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.credentials.clientId,
            client_secret: this.credentials.clientSecret,
        });
        const response = await this.http.post(this.credentials.tokenUrl ?? DEFAULT_TOKEN_URL, body.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const { access_token: accessToken, expires_in: expiresIn } = response.data ?? {};
        if (!accessToken) {
            throw new Error('A resposta do pedido de token não trouxe access_token.');
        }
        const lifetimeSeconds = Math.max((Number(expiresIn) || 0) - RENEWAL_MARGIN_SECONDS, 0);
        this.cached = { accessToken, expiresAt: this.now() + lifetimeSeconds * 1000 };
        return accessToken;
    }
}

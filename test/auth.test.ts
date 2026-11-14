import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenManager } from '../src/auth';
import { buildBaseUrl } from '../src/client';

function fakeHttp(expiresIn: number) {
    const calls: string[] = [];
    const http = {
        post: async (url: string, body: string) => {
            calls.push(body);
            return { data: { access_token: `token-${calls.length}`, expires_in: expiresIn } };
        },
    };
    return { http: http as never, calls };
}

test('reaproveita o token enquanto ele vale', async () => {
    const { http, calls } = fakeHttp(900);
    let clock = 0;
    const tokens = new TokenManager({ clientId: 'id', clientSecret: 'secret' }, http, () => clock);
    assert.equal(await tokens.getAccessToken(), 'token-1');
    clock = 800_000;
    assert.equal(await tokens.getAccessToken(), 'token-1');
    assert.equal(calls.length, 1);
    assert.match(calls[0], /grant_type=client_credentials/);
});

test('pede outro token perto do vencimento', async () => {
    const { http, calls } = fakeHttp(900);
    let clock = 0;
    const tokens = new TokenManager({ clientId: 'id', clientSecret: 'secret' }, http, () => clock);
    await tokens.getAccessToken();
    clock = 841_000;
    assert.equal(await tokens.getAccessToken(), 'token-2');
    assert.equal(calls.length, 2);
});

test('chamadas simultâneas fazem um só pedido', async () => {
    const { http, calls } = fakeHttp(900);
    const tokens = new TokenManager({ clientId: 'id', clientSecret: 'secret' }, http);
    const results = await Promise.all([tokens.getAccessToken(), tokens.getAccessToken(), tokens.getAccessToken()]);
    assert.deepEqual(results, ['token-1', 'token-1', 'token-1']);
    assert.equal(calls.length, 1);
});

test('invalidate força um token novo', async () => {
    const { http } = fakeHttp(900);
    const tokens = new TokenManager({ clientId: 'id', clientSecret: 'secret' }, http);
    await tokens.getAccessToken();
    tokens.invalidate();
    assert.equal(await tokens.getAccessToken(), 'token-2');
});

test('exige credenciais e subdomínio válido', () => {
    assert.throws(() => new TokenManager({ clientId: '', clientSecret: 'x' }));
    assert.equal(buildBaseUrl('acme'), 'https://acme.platform-api.magnetcustomer.com');
    assert.throws(() => buildBaseUrl('https://acme.magnetcustomer.com'));
});

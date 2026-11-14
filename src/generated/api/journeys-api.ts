/* tslint:disable */
/* eslint-disable */
/**
 * API da Magnet Customer
 * A API REST da Magnet Customer permite ler e gravar os registros do CRM a partir dos seus sistemas.  # Comece aqui  ## 1. Crie um Service Account  No CRM, abra **Configurações › Service Accounts** (apenas administradores), clique em **Novo service account**, escolha a validade e as permissões, e copie o **Client ID** e o **Client Secret**. O secret aparece uma única vez.  ## 2. Solicite um token  ```bash curl -X POST https://magnetcustomer.net/realms/platform/protocol/openid-connect/token \\   -H \"Content-Type: application/x-www-form-urlencoded\" \\   -d \"grant_type=client_credentials\" \\   -d \"client_id=SEU_CLIENT_ID\" \\   -d \"client_secret=SEU_CLIENT_SECRET\" ```  ```json { \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\", \"expires_in\": 900, \"token_type\": \"Bearer\" } ```  O token vale 15 minutos e este fluxo não tem refresh token: quando vencer, ou ao receber `401`, repita o pedido.  ## 3. Chame a API  Cada conta tem o seu endereço. Troque `sua-conta` pelo subdomínio que você usa para abrir o CRM:  ```bash curl \"https://sua-conta.platform-api.magnetcustomer.com/api/deals?page=1&limit=15\" \\   -H \"Authorization: Bearer SEU_TOKEN\" ```  Requisições com corpo levam também `Content-Type: application/json`.  # Convenções  ## Paginação  Envie sempre `page`. Com ele, toda listagem devolve o mesmo envelope:  ```json { \"docs\": [], \"total\": 132, \"pages\": 9, \"page\": 1, \"limit\": 15 } ```  | Parâmetro | Padrão | Descrição | |---|---|---| | `page` | — | Página, a partir de 1. **Obrigatório na prática** | | `limit` | 15 | Registros por página. Máximo 100: acima disso a API usa 100 | | `sortBy` | varia por recurso | Campo de ordenação | | `sortType` | `desc` | `asc` ou `desc` | | `search` | — | Busca textual, quando o recurso aceita |  Sem `page`, algumas listagens (Contatos, Pipelines, Campos personalizados e os cadastros de apoio, como tipos e situações) devolvem uma lista simples (`[...]`), sem o envelope, e ignoram `limit`. Para percorrer tudo, peça `page=1` e avance até `page` ser igual a `pages`. Uma página além do fim devolve `docs` vazio.  O tamanho de página padrão é 15, com duas exceções: 25 em Leads, Prospects e Clientes, e 100 em Usuários. Um `limit` inválido cai no padrão.  ## Identificadores e datas  Todo ID é um texto de 24 caracteres hexadecimais, como `507f1f77bcf86cd799439011`. Ao gravar, envie a referência como **ID em texto** — nunca o objeto.  Um ID fora desse formato hoje é respondido com `500`, não `400`: valide o formato antes de enviar.  No corpo e nas respostas, datas são ISO 8601 em UTC, como `2026-05-15T10:00:00Z`. Nos filtros de data da URL (`minDate`, `createdAt_minDate`, `dateOfExpires_minDate`...), envie um **timestamp em milissegundos**, como `1798761600000`.  ## Listas na URL  Filtros que aceitam vários valores levam colchetes no nome, mesmo quando o valor é um só:  ``` /api/contacts?page=1&staffs[]=507f191e810c19729de860eb&staffs[]=507f191e810c19729de860ec ```  Sem colchetes, um valor único é recusado com erro em parte das listagens.  ## Campos ausentes  Campo sem valor costuma vir **ausente** da resposta, não como `null`. Trate a falta da chave como vazio.  ## Campos personalizados  Os campos criados pelo administrador da conta vão na lista `customFields`:  ```json { \"customFields\": [ { \"customField\": \"507f1f77bcf86cd799439014\", \"k\": \"segmento\", \"v\": \"Tecnologia\" } ] } ```  O valor vai em **`v`**. Um item com `value` é aceito sem erro, mas o campo fica vazio. Descubra os campos e os IDs com `GET /api/customfields?page=1&feature=deal` (troque `deal` por `meeting`, `task`, `contact`...). Com `&required=true` vêm só os obrigatórios da conta.  ## Erros  ```json {   \"reason\": \"Missing required parameters\",   \"message\": \"Missing required parameters\",   \"code\": \"VALIDATION_ERROR\",   \"errors\": [ { \"field\": \"title\", \"message\": \"must NOT have fewer than 1 characters\", \"keyword\": \"minLength\" } ] } ```  | Status | Quando | |---|---| | `400` | Corpo inválido: campo obrigatório ausente, tipo errado, valor fora da lista | | `401` | Token ausente, inválido ou vencido. Corpo: `{\"reason\": \"Access Denied\"}` | | `403` | O Service Account não tem a permissão da rota (`type: SA_PERMISSION_DENIED`, com `requiredPermission`) | | `404` | Registro não encontrado | | `409` | O registro não está no estado que a operação exige | | `429` | Limite de requisições excedido. Espere o tempo de `Retry-After` |  ## Permissões  Um Service Account só chama as rotas que as permissões dele liberam. Cada operação desta referência informa a permissão exigida, quando há uma: marque-a ao criar o Service Account. Uma chamada sem a permissão devolve `403` com o nome dela em `requiredPermission`.  Rotas de administração da conta (usuários, perfis, criação de webhooks, configurações) exigem um usuário administrador e não estão disponíveis para Service Accounts; por isso não aparecem aqui.  ## Limite de requisições  Os limites são aplicados por conta. Ao receber `429`, espere os segundos indicados em `Retry-After` e tente de novo com intervalo crescente.  ## Área de trabalho  Em contas com áreas de trabalho, a API define a área do registro pela credencial ou pelo registro pai. Não envie `workspace`.  # Webhooks  Para ser avisado quando algo muda no CRM, em vez de consultar a API de tempos em tempos, use webhooks. Um administrador cria o webhook no CRM, em **Integrações › Webhooks**, informando a URL do seu sistema e os eventos. A lista de eventos está em `GET /api/webhooks/triggers`; o formato da entrega, a assinatura e os reenvios estão na seção Webhooks do portal.  # Cobertura  Esta referência cobre Contatos (leads, prospects e clientes), Empresas, Oportunidades, Pipelines, etapas e motivos de perda, Jornadas, Reuniões, Tarefas, Observações, Tickets, Atendimentos, Usuários, Equipes, Áreas de trabalho, Campos personalizados e os eventos de webhook. 
 *
 * The version of the OpenAPI document: 2026-11
 * Contact: suporte@magnetcustomer.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import type { Configuration } from '../configuration';
import type { AxiosPromise, AxiosInstance, RawAxiosRequestConfig } from 'axios';
import globalAxios from 'axios';
// Some imports not used depending on template conditions
// @ts-ignore
import { DUMMY_BASE_URL, assertParamExists, setApiKeyToObject, setBasicAuthToObject, setBearerAuthToObject, setOAuthToObject, setSearchParams, serializeDataIfNeeded, toPathString, createRequestFunction, replaceWithSerializableTypeIfNeeded } from '../common';
// @ts-ignore
import { BASE_PATH, COLLECTION_FORMATS, type RequestArgs, BaseAPI, RequiredError, operationServerMap } from '../base';
// @ts-ignore
import type { GetJourneyHealthScore200Response } from '../models';
// @ts-ignore
import type { Journey } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListJourneys200Response } from '../models';
/**
 * JourneysApi - axios parameter creator
 */
export const JourneysApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * **Permissão do Service Account:** `journeys.read`
         * @summary Obter jornada
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getJourney: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getJourney', 'id', id)
            const localVarPath = `/api/journeys/{id}`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication ServiceAccount required
            // oauth required
            await setOAuthToObject(localVarHeaderParameter, "ServiceAccount", [], configuration)

            localVarHeaderParameter['Accept'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Devolve o valor em vigor, o valor calculado e os componentes do cálculo.
         * @summary Obter health score da jornada
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getJourneyHealthScore: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getJourneyHealthScore', 'id', id)
            const localVarPath = `/api/journeys/{id}/health-score`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication ServiceAccount required
            // oauth required
            await setOAuthToObject(localVarHeaderParameter, "ServiceAccount", [], configuration)

            localVarHeaderParameter['Accept'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `journeys.list`
         * @summary Listar jornadas
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {ListJourneysStatusEnum} [status] Situação.
         * @param {string} [journeyFlow] ID do fluxo de jornada.
         * @param {string} [phase] ID da fase.
         * @param {Array<string>} [staffs] Responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [contact] ID do contato.
         * @param {string} [organization] ID da empresa.
         * @param {string} [sourceDeal] ID da oportunidade de origem.
         * @param {number} [healthScoreMin] Health score mínimo.
         * @param {number} [healthScoreMax] Health score máximo.
         * @param {string} [search] Busca no título.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listJourneys: async (page?: number, limit?: number, status?: ListJourneysStatusEnum, journeyFlow?: string, phase?: string, staffs?: Array<string>, contact?: string, organization?: string, sourceDeal?: string, healthScoreMin?: number, healthScoreMax?: number, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/journeys`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication ServiceAccount required
            // oauth required
            await setOAuthToObject(localVarHeaderParameter, "ServiceAccount", [], configuration)

            if (page !== undefined) {
                localVarQueryParameter['page'] = page;
            }

            if (limit !== undefined) {
                localVarQueryParameter['limit'] = limit;
            }

            if (status !== undefined) {
                localVarQueryParameter['status'] = status;
            }

            if (journeyFlow !== undefined) {
                localVarQueryParameter['journeyFlow'] = journeyFlow;
            }

            if (phase !== undefined) {
                localVarQueryParameter['phase'] = phase;
            }

            if (staffs) {
                localVarQueryParameter['staffs[]'] = staffs;
            }

            if (contact !== undefined) {
                localVarQueryParameter['contact'] = contact;
            }

            if (organization !== undefined) {
                localVarQueryParameter['organization'] = organization;
            }

            if (sourceDeal !== undefined) {
                localVarQueryParameter['sourceDeal'] = sourceDeal;
            }

            if (healthScoreMin !== undefined) {
                localVarQueryParameter['healthScoreMin'] = healthScoreMin;
            }

            if (healthScoreMax !== undefined) {
                localVarQueryParameter['healthScoreMax'] = healthScoreMax;
            }

            if (search !== undefined) {
                localVarQueryParameter['search'] = search;
            }

            localVarHeaderParameter['Accept'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * JourneysApi - functional programming interface
 */
export const JourneysApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = JourneysApiAxiosParamCreator(configuration)
    return {
        /**
         * **Permissão do Service Account:** `journeys.read`
         * @summary Obter jornada
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getJourney(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Journey>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getJourney(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['JourneysApi.getJourney']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Devolve o valor em vigor, o valor calculado e os componentes do cálculo.
         * @summary Obter health score da jornada
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getJourneyHealthScore(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetJourneyHealthScore200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getJourneyHealthScore(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['JourneysApi.getJourneyHealthScore']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `journeys.list`
         * @summary Listar jornadas
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {ListJourneysStatusEnum} [status] Situação.
         * @param {string} [journeyFlow] ID do fluxo de jornada.
         * @param {string} [phase] ID da fase.
         * @param {Array<string>} [staffs] Responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [contact] ID do contato.
         * @param {string} [organization] ID da empresa.
         * @param {string} [sourceDeal] ID da oportunidade de origem.
         * @param {number} [healthScoreMin] Health score mínimo.
         * @param {number} [healthScoreMax] Health score máximo.
         * @param {string} [search] Busca no título.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listJourneys(page?: number, limit?: number, status?: ListJourneysStatusEnum, journeyFlow?: string, phase?: string, staffs?: Array<string>, contact?: string, organization?: string, sourceDeal?: string, healthScoreMin?: number, healthScoreMax?: number, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListJourneys200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listJourneys(page, limit, status, journeyFlow, phase, staffs, contact, organization, sourceDeal, healthScoreMin, healthScoreMax, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['JourneysApi.listJourneys']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * JourneysApi - factory interface
 */
export const JourneysApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = JourneysApiFp(configuration)
    return {
        /**
         * **Permissão do Service Account:** `journeys.read`
         * @summary Obter jornada
         * @param {JourneysApiGetJourneyRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getJourney(requestParameters: JourneysApiGetJourneyRequest, options?: RawAxiosRequestConfig): AxiosPromise<Journey> {
            return localVarFp.getJourney(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Devolve o valor em vigor, o valor calculado e os componentes do cálculo.
         * @summary Obter health score da jornada
         * @param {JourneysApiGetJourneyHealthScoreRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getJourneyHealthScore(requestParameters: JourneysApiGetJourneyHealthScoreRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetJourneyHealthScore200Response> {
            return localVarFp.getJourneyHealthScore(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `journeys.list`
         * @summary Listar jornadas
         * @param {JourneysApiListJourneysRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listJourneys(requestParameters: JourneysApiListJourneysRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListJourneys200Response> {
            return localVarFp.listJourneys(requestParameters.page, requestParameters.limit, requestParameters.status, requestParameters.journeyFlow, requestParameters.phase, requestParameters.staffs, requestParameters.contact, requestParameters.organization, requestParameters.sourceDeal, requestParameters.healthScoreMin, requestParameters.healthScoreMax, requestParameters.search, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for getJourney operation in JourneysApi.
 */
export interface JourneysApiGetJourneyRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getJourneyHealthScore operation in JourneysApi.
 */
export interface JourneysApiGetJourneyHealthScoreRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listJourneys operation in JourneysApi.
 */
export interface JourneysApiListJourneysRequest {
    /**
     * Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
     */
    readonly page?: number

    /**
     * Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
     */
    readonly limit?: number

    /**
     * Situação.
     */
    readonly status?: ListJourneysStatusEnum

    /**
     * ID do fluxo de jornada.
     */
    readonly journeyFlow?: string

    /**
     * ID da fase.
     */
    readonly phase?: string

    /**
     * Responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
     */
    readonly staffs?: Array<string>

    /**
     * ID do contato.
     */
    readonly contact?: string

    /**
     * ID da empresa.
     */
    readonly organization?: string

    /**
     * ID da oportunidade de origem.
     */
    readonly sourceDeal?: string

    /**
     * Health score mínimo.
     */
    readonly healthScoreMin?: number

    /**
     * Health score máximo.
     */
    readonly healthScoreMax?: number

    /**
     * Busca no título.
     */
    readonly search?: string
}

/**
 * JourneysApi - object-oriented interface
 */
export class JourneysApi extends BaseAPI {
    /**
     * **Permissão do Service Account:** `journeys.read`
     * @summary Obter jornada
     * @param {JourneysApiGetJourneyRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getJourney(requestParameters: JourneysApiGetJourneyRequest, options?: RawAxiosRequestConfig) {
        return JourneysApiFp(this.configuration).getJourney(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Devolve o valor em vigor, o valor calculado e os componentes do cálculo.
     * @summary Obter health score da jornada
     * @param {JourneysApiGetJourneyHealthScoreRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getJourneyHealthScore(requestParameters: JourneysApiGetJourneyHealthScoreRequest, options?: RawAxiosRequestConfig) {
        return JourneysApiFp(this.configuration).getJourneyHealthScore(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `journeys.list`
     * @summary Listar jornadas
     * @param {JourneysApiListJourneysRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listJourneys(requestParameters: JourneysApiListJourneysRequest = {}, options?: RawAxiosRequestConfig) {
        return JourneysApiFp(this.configuration).listJourneys(requestParameters.page, requestParameters.limit, requestParameters.status, requestParameters.journeyFlow, requestParameters.phase, requestParameters.staffs, requestParameters.contact, requestParameters.organization, requestParameters.sourceDeal, requestParameters.healthScoreMin, requestParameters.healthScoreMax, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListJourneysStatusEnum = {
    active: 'active',
    success: 'success',
    churn: 'churn',
} as const;
export type ListJourneysStatusEnum = typeof ListJourneysStatusEnum[keyof typeof ListJourneysStatusEnum];

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
import type { Contact } from '../models';
// @ts-ignore
import type { ContactInput } from '../models';
// @ts-ignore
import type { ListContacts200Response } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
/**
 * CustomersApi - axios parameter creator
 */
export const CustomersApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * O corpo não tem campo obrigatório fixo: o administrador da conta define quais são. `GET /api/customfields?feature=contact&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`. Os registros criados por aqui entram como `customer`.
         * @summary Criar cliente
         * @param {ContactInput} contactInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createCustomer: async (contactInput: ContactInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'contactInput' is not null or undefined
            assertParamExists('createCustomer', 'contactInput', contactInput)
            const localVarPath = `/api/customers`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication ServiceAccount required
            // oauth required
            await setOAuthToObject(localVarHeaderParameter, "ServiceAccount", [], configuration)

            localVarHeaderParameter['Content-Type'] = 'application/json';
            localVarHeaderParameter['Accept'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(contactInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Exige a permissão de excluir.
         * @summary Excluir cliente
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteCustomer: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteCustomer', 'id', id)
            const localVarPath = `/api/customers/{id}`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'DELETE', ...baseOptions, ...options};
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
         * 
         * @summary Obter cliente
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCustomer: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getCustomer', 'id', id)
            const localVarPath = `/api/customers/{id}`
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
         * Ordenação padrão: `createdAt` decrescente. Tamanho de página padrão: 25.  **Atenção:** esta listagem traz também os registros excluídos (`active: false`). Para receber só os ativos, descarte os que vêm com `active: false` ou use `GET /api/contacts?lifeCycle=customer`.
         * @summary Listar clientes
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListCustomersSortTypeEnum} [sortType] Direção da ordenação.
         * @param {Array<string>} [staffs] Usuários responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [organization] ID da empresa vinculada.
         * @param {string} [search] Busca em nome, e-mail, telefone e documento.
         * @param {boolean} [emailsEmpty] Com &#x60;true&#x60;, só os sem e-mail.
         * @param {boolean} [phonesEmpty] Com &#x60;true&#x60;, só os sem telefone.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCustomers: async (page?: number, limit?: number, sortBy?: string, sortType?: ListCustomersSortTypeEnum, staffs?: Array<string>, organization?: string, search?: string, emailsEmpty?: boolean, phonesEmpty?: boolean, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/customers`;
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

            if (sortBy !== undefined) {
                localVarQueryParameter['sortBy'] = sortBy;
            }

            if (sortType !== undefined) {
                localVarQueryParameter['sortType'] = sortType;
            }

            if (staffs) {
                localVarQueryParameter['staffs[]'] = staffs;
            }

            if (organization !== undefined) {
                localVarQueryParameter['organization'] = organization;
            }

            if (search !== undefined) {
                localVarQueryParameter['search'] = search;
            }

            if (emailsEmpty !== undefined) {
                localVarQueryParameter['emailsEmpty'] = emailsEmpty;
            }

            if (phonesEmpty !== undefined) {
                localVarQueryParameter['phonesEmpty'] = phonesEmpty;
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
        /**
         * Envie só os campos que mudam.
         * @summary Atualizar cliente
         * @param {string} id ID do registro.
         * @param {ContactInput} contactInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateCustomer: async (id: string, contactInput: ContactInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateCustomer', 'id', id)
            // verify required parameter 'contactInput' is not null or undefined
            assertParamExists('updateCustomer', 'contactInput', contactInput)
            const localVarPath = `/api/customers/{id}`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'PUT', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication ServiceAccount required
            // oauth required
            await setOAuthToObject(localVarHeaderParameter, "ServiceAccount", [], configuration)

            localVarHeaderParameter['Content-Type'] = 'application/json';
            localVarHeaderParameter['Accept'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(contactInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * CustomersApi - functional programming interface
 */
export const CustomersApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = CustomersApiAxiosParamCreator(configuration)
    return {
        /**
         * O corpo não tem campo obrigatório fixo: o administrador da conta define quais são. `GET /api/customfields?feature=contact&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`. Os registros criados por aqui entram como `customer`.
         * @summary Criar cliente
         * @param {ContactInput} contactInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createCustomer(contactInput: ContactInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Contact>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createCustomer(contactInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CustomersApi.createCustomer']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Exige a permissão de excluir.
         * @summary Excluir cliente
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteCustomer(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteCustomer(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CustomersApi.deleteCustomer']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Obter cliente
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getCustomer(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Contact>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getCustomer(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CustomersApi.getCustomer']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `createdAt` decrescente. Tamanho de página padrão: 25.  **Atenção:** esta listagem traz também os registros excluídos (`active: false`). Para receber só os ativos, descarte os que vêm com `active: false` ou use `GET /api/contacts?lifeCycle=customer`.
         * @summary Listar clientes
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListCustomersSortTypeEnum} [sortType] Direção da ordenação.
         * @param {Array<string>} [staffs] Usuários responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [organization] ID da empresa vinculada.
         * @param {string} [search] Busca em nome, e-mail, telefone e documento.
         * @param {boolean} [emailsEmpty] Com &#x60;true&#x60;, só os sem e-mail.
         * @param {boolean} [phonesEmpty] Com &#x60;true&#x60;, só os sem telefone.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listCustomers(page?: number, limit?: number, sortBy?: string, sortType?: ListCustomersSortTypeEnum, staffs?: Array<string>, organization?: string, search?: string, emailsEmpty?: boolean, phonesEmpty?: boolean, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListContacts200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listCustomers(page, limit, sortBy, sortType, staffs, organization, search, emailsEmpty, phonesEmpty, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CustomersApi.listCustomers']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só os campos que mudam.
         * @summary Atualizar cliente
         * @param {string} id ID do registro.
         * @param {ContactInput} contactInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateCustomer(id: string, contactInput: ContactInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Contact>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateCustomer(id, contactInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CustomersApi.updateCustomer']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * CustomersApi - factory interface
 */
export const CustomersApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = CustomersApiFp(configuration)
    return {
        /**
         * O corpo não tem campo obrigatório fixo: o administrador da conta define quais são. `GET /api/customfields?feature=contact&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`. Os registros criados por aqui entram como `customer`.
         * @summary Criar cliente
         * @param {CustomersApiCreateCustomerRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createCustomer(requestParameters: CustomersApiCreateCustomerRequest, options?: RawAxiosRequestConfig): AxiosPromise<Contact> {
            return localVarFp.createCustomer(requestParameters.contactInput, options).then((request) => request(axios, basePath));
        },
        /**
         * Exige a permissão de excluir.
         * @summary Excluir cliente
         * @param {CustomersApiDeleteCustomerRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteCustomer(requestParameters: CustomersApiDeleteCustomerRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.deleteCustomer(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Obter cliente
         * @param {CustomersApiGetCustomerRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCustomer(requestParameters: CustomersApiGetCustomerRequest, options?: RawAxiosRequestConfig): AxiosPromise<Contact> {
            return localVarFp.getCustomer(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `createdAt` decrescente. Tamanho de página padrão: 25.  **Atenção:** esta listagem traz também os registros excluídos (`active: false`). Para receber só os ativos, descarte os que vêm com `active: false` ou use `GET /api/contacts?lifeCycle=customer`.
         * @summary Listar clientes
         * @param {CustomersApiListCustomersRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCustomers(requestParameters: CustomersApiListCustomersRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListContacts200Response> {
            return localVarFp.listCustomers(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.staffs, requestParameters.organization, requestParameters.search, requestParameters.emailsEmpty, requestParameters.phonesEmpty, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só os campos que mudam.
         * @summary Atualizar cliente
         * @param {CustomersApiUpdateCustomerRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateCustomer(requestParameters: CustomersApiUpdateCustomerRequest, options?: RawAxiosRequestConfig): AxiosPromise<Contact> {
            return localVarFp.updateCustomer(requestParameters.id, requestParameters.contactInput, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createCustomer operation in CustomersApi.
 */
export interface CustomersApiCreateCustomerRequest {
    readonly contactInput: ContactInput
}

/**
 * Request parameters for deleteCustomer operation in CustomersApi.
 */
export interface CustomersApiDeleteCustomerRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getCustomer operation in CustomersApi.
 */
export interface CustomersApiGetCustomerRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listCustomers operation in CustomersApi.
 */
export interface CustomersApiListCustomersRequest {
    /**
     * Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
     */
    readonly page?: number

    /**
     * Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
     */
    readonly limit?: number

    /**
     * Campo de ordenação. O padrão varia por recurso.
     */
    readonly sortBy?: string

    /**
     * Direção da ordenação.
     */
    readonly sortType?: ListCustomersSortTypeEnum

    /**
     * Usuários responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
     */
    readonly staffs?: Array<string>

    /**
     * ID da empresa vinculada.
     */
    readonly organization?: string

    /**
     * Busca em nome, e-mail, telefone e documento.
     */
    readonly search?: string

    /**
     * Com &#x60;true&#x60;, só os sem e-mail.
     */
    readonly emailsEmpty?: boolean

    /**
     * Com &#x60;true&#x60;, só os sem telefone.
     */
    readonly phonesEmpty?: boolean
}

/**
 * Request parameters for updateCustomer operation in CustomersApi.
 */
export interface CustomersApiUpdateCustomerRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly contactInput: ContactInput
}

/**
 * CustomersApi - object-oriented interface
 */
export class CustomersApi extends BaseAPI {
    /**
     * O corpo não tem campo obrigatório fixo: o administrador da conta define quais são. `GET /api/customfields?feature=contact&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`. Os registros criados por aqui entram como `customer`.
     * @summary Criar cliente
     * @param {CustomersApiCreateCustomerRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createCustomer(requestParameters: CustomersApiCreateCustomerRequest, options?: RawAxiosRequestConfig) {
        return CustomersApiFp(this.configuration).createCustomer(requestParameters.contactInput, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Exige a permissão de excluir.
     * @summary Excluir cliente
     * @param {CustomersApiDeleteCustomerRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteCustomer(requestParameters: CustomersApiDeleteCustomerRequest, options?: RawAxiosRequestConfig) {
        return CustomersApiFp(this.configuration).deleteCustomer(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Obter cliente
     * @param {CustomersApiGetCustomerRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getCustomer(requestParameters: CustomersApiGetCustomerRequest, options?: RawAxiosRequestConfig) {
        return CustomersApiFp(this.configuration).getCustomer(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `createdAt` decrescente. Tamanho de página padrão: 25.  **Atenção:** esta listagem traz também os registros excluídos (`active: false`). Para receber só os ativos, descarte os que vêm com `active: false` ou use `GET /api/contacts?lifeCycle=customer`.
     * @summary Listar clientes
     * @param {CustomersApiListCustomersRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listCustomers(requestParameters: CustomersApiListCustomersRequest = {}, options?: RawAxiosRequestConfig) {
        return CustomersApiFp(this.configuration).listCustomers(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.staffs, requestParameters.organization, requestParameters.search, requestParameters.emailsEmpty, requestParameters.phonesEmpty, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só os campos que mudam.
     * @summary Atualizar cliente
     * @param {CustomersApiUpdateCustomerRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateCustomer(requestParameters: CustomersApiUpdateCustomerRequest, options?: RawAxiosRequestConfig) {
        return CustomersApiFp(this.configuration).updateCustomer(requestParameters.id, requestParameters.contactInput, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListCustomersSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListCustomersSortTypeEnum = typeof ListCustomersSortTypeEnum[keyof typeof ListCustomersSortTypeEnum];

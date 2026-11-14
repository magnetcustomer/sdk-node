/* tslint:disable */
/* eslint-disable */
/**
 * API da Magnet Customer
 * A API REST da Magnet Customer permite ler e gravar os registros do CRM a partir dos seus sistemas.  # Comece aqui  ## 1. Crie um Service Account  No CRM, abra **Configurações › Service Accounts** (apenas administradores), clique em **Novo service account**, escolha a validade e as permissões, e copie o **Client ID** e o **Client Secret**. O secret aparece uma única vez.  ## 2. Solicite um token  ```bash curl -X POST https://magnetcustomer.net/realms/platform/protocol/openid-connect/token \\   -H \"Content-Type: application/x-www-form-urlencoded\" \\   -d \"grant_type=client_credentials\" \\   -d \"client_id=SEU_CLIENT_ID\" \\   -d \"client_secret=SEU_CLIENT_SECRET\" ```  ```json { \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\", \"expires_in\": 900, \"token_type\": \"Bearer\" } ```  O token vale 15 minutos e este fluxo não tem refresh token: quando vencer, ou ao receber `401`, repita o pedido.  ## 3. Chame a API  Cada conta tem o seu endereço. Troque `sua-conta` pelo subdomínio que você usa para abrir o CRM:  ```bash curl \"https://sua-conta.platform-api.magnetcustomer.com/api/deals?page=1&limit=15\" \\   -H \"Authorization: Bearer SEU_TOKEN\" ```  Requisições com corpo levam também `Content-Type: application/json`.  # Convenções  ## Paginação  Envie sempre `page`. Com ele, toda listagem devolve o mesmo envelope:  ```json { \"docs\": [], \"total\": 132, \"pages\": 9, \"page\": 1, \"limit\": 15 } ```  | Parâmetro | Padrão | Descrição | |---|---|---| | `page` | — | Página, a partir de 1. **Obrigatório na prática** | | `limit` | 15 | Registros por página. Máximo 100: acima disso a API usa 100 | | `sortBy` | varia por recurso | Campo de ordenação | | `sortType` | `desc` | `asc` ou `desc` | | `search` | — | Busca textual, quando o recurso aceita |  Sem `page`, algumas listagens (Contatos, Pipelines, Campos personalizados e os cadastros de apoio, como tipos e situações) devolvem uma lista simples (`[...]`), sem o envelope, e ignoram `limit`. Para percorrer tudo, peça `page=1` e avance até `page` ser igual a `pages`. Uma página além do fim devolve `docs` vazio.  O tamanho de página padrão é 15, com duas exceções: 25 em Leads, Prospects e Clientes, e 100 em Usuários. Um `limit` inválido cai no padrão.  ## Identificadores e datas  Todo ID é um texto de 24 caracteres hexadecimais, como `507f1f77bcf86cd799439011`. Ao gravar, envie a referência como **ID em texto** — nunca o objeto.  Um ID fora desse formato hoje é respondido com `500`, não `400`: valide o formato antes de enviar.  No corpo e nas respostas, datas são ISO 8601 em UTC, como `2026-05-15T10:00:00Z`. Nos filtros de data da URL (`minDate`, `createdAt_minDate`, `dateOfExpires_minDate`...), envie um **timestamp em milissegundos**, como `1798761600000`.  ## Listas na URL  Filtros que aceitam vários valores levam colchetes no nome, mesmo quando o valor é um só:  ``` /api/contacts?page=1&staffs[]=507f191e810c19729de860eb&staffs[]=507f191e810c19729de860ec ```  Sem colchetes, um valor único é recusado com erro em parte das listagens.  ## Campos ausentes  Campo sem valor costuma vir **ausente** da resposta, não como `null`. Trate a falta da chave como vazio.  ## Campos personalizados  Os campos criados pelo administrador da conta vão na lista `customFields`:  ```json { \"customFields\": [ { \"customField\": \"507f1f77bcf86cd799439014\", \"k\": \"segmento\", \"v\": \"Tecnologia\" } ] } ```  O valor vai em **`v`**. Um item com `value` é aceito sem erro, mas o campo fica vazio. Descubra os campos e os IDs com `GET /api/customfields?page=1&feature=deal` (troque `deal` por `meeting`, `task`, `contact`...). Com `&required=true` vêm só os obrigatórios da conta.  ## Erros  ```json {   \"reason\": \"Missing required parameters\",   \"message\": \"Missing required parameters\",   \"code\": \"VALIDATION_ERROR\",   \"errors\": [ { \"field\": \"title\", \"message\": \"must NOT have fewer than 1 characters\", \"keyword\": \"minLength\" } ] } ```  | Status | Quando | |---|---| | `400` | Corpo inválido: campo obrigatório ausente, tipo errado, valor fora da lista | | `401` | Token ausente, inválido ou vencido. Corpo: `{\"reason\": \"Access Denied\"}` | | `403` | O Service Account não tem a permissão da rota (`type: SA_PERMISSION_DENIED`, com `requiredPermission`) | | `404` | Registro não encontrado | | `409` | O registro não está no estado que a operação exige | | `429` | Limite de requisições excedido. Espere o tempo de `Retry-After` |  ## Permissões  Um Service Account só chama as rotas que as permissões dele liberam. Cada operação desta referência informa a permissão exigida, quando há uma: marque-a ao criar o Service Account. Uma chamada sem a permissão devolve `403` com o nome dela em `requiredPermission`.  Rotas de administração da conta (usuários, perfis, criação de webhooks, configurações) exigem um usuário administrador e não estão disponíveis para Service Accounts; por isso não aparecem aqui.  ## Limite de requisições  Os limites são aplicados por conta. Ao receber `429`, espere os segundos indicados em `Retry-After` e tente de novo com intervalo crescente.  ## Área de trabalho  Em contas com áreas de trabalho, a API define a área do registro pela credencial ou pelo registro pai. Não envie `workspace`.  # Webhooks  Para ser avisado quando algo muda no CRM, em vez de consultar a API de tempos em tempos, use webhooks. Um administrador cria o webhook no CRM, em **Integrações › Webhooks**, informando a URL do seu sistema e os eventos. A lista de eventos está em `GET /api/webhooks/triggers`; o formato da entrega, a assinatura e os reenvios estão na seção Webhooks do portal.  # Cobertura  Esta referência cobre Contatos (leads, prospects e clientes), Empresas, Oportunidades, Pipelines, etapas e motivos de perda, Produtos, tabelas de preço e itens de produto, Jornadas, Reuniões, Tarefas, Observações, Tickets, Atendimentos, Usuários, Equipes, Áreas de trabalho, Campos personalizados e os eventos de webhook. 
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
import type { CreateTaskTypeRequest } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListTaskTypes200Response } from '../models';
// @ts-ignore
import type { TaskType } from '../models';
// @ts-ignore
import type { UpdateTaskTypeRequest } from '../models';
/**
 * TaskTypesApi - axios parameter creator
 */
export const TaskTypesApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Não envie `slug`: ele é gerado a partir do nome.
         * @summary Criar tipo de tarefa
         * @param {CreateTaskTypeRequest} createTaskTypeRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTaskType: async (createTaskTypeRequest: CreateTaskTypeRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createTaskTypeRequest' is not null or undefined
            assertParamExists('createTaskType', 'createTaskTypeRequest', createTaskTypeRequest)
            const localVarPath = `/api/tasks/types`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createTaskTypeRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Exclusão definitiva. As tarefas que usam o tipo continuam existindo, apontando para um tipo que não existe mais.
         * @summary Excluir tipo de tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteTaskType: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteTaskType', 'id', id)
            const localVarPath = `/api/tasks/types/{id}`
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
         * @summary Obter tipo de tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTaskType: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getTaskType', 'id', id)
            const localVarPath = `/api/tasks/types/{id}`
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
         * Sem `page`, devolve uma lista simples com todos os tipos. Com `page`, devolve o envelope paginado.  **Permissão do Service Account:** `tasks.read`
         * @summary Listar tipos de tarefa
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [search] Busca no nome.
         * @param {boolean} [active] Filtra por ativos.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTaskTypes: async (page?: number, limit?: number, search?: string, active?: boolean, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/tasks/types`;
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

            if (search !== undefined) {
                localVarQueryParameter['search'] = search;
            }

            if (active !== undefined) {
                localVarQueryParameter['active'] = active;
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
         * 
         * @summary Atualizar tipo de tarefa
         * @param {string} id ID do registro.
         * @param {UpdateTaskTypeRequest} updateTaskTypeRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateTaskType: async (id: string, updateTaskTypeRequest: UpdateTaskTypeRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateTaskType', 'id', id)
            // verify required parameter 'updateTaskTypeRequest' is not null or undefined
            assertParamExists('updateTaskType', 'updateTaskTypeRequest', updateTaskTypeRequest)
            const localVarPath = `/api/tasks/types/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateTaskTypeRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * TaskTypesApi - functional programming interface
 */
export const TaskTypesApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = TaskTypesApiAxiosParamCreator(configuration)
    return {
        /**
         * Não envie `slug`: ele é gerado a partir do nome.
         * @summary Criar tipo de tarefa
         * @param {CreateTaskTypeRequest} createTaskTypeRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createTaskType(createTaskTypeRequest: CreateTaskTypeRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TaskType>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createTaskType(createTaskTypeRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TaskTypesApi.createTaskType']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Exclusão definitiva. As tarefas que usam o tipo continuam existindo, apontando para um tipo que não existe mais.
         * @summary Excluir tipo de tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteTaskType(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteTaskType(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TaskTypesApi.deleteTaskType']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Obter tipo de tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getTaskType(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TaskType>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getTaskType(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TaskTypesApi.getTaskType']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Sem `page`, devolve uma lista simples com todos os tipos. Com `page`, devolve o envelope paginado.  **Permissão do Service Account:** `tasks.read`
         * @summary Listar tipos de tarefa
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [search] Busca no nome.
         * @param {boolean} [active] Filtra por ativos.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listTaskTypes(page?: number, limit?: number, search?: string, active?: boolean, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListTaskTypes200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listTaskTypes(page, limit, search, active, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TaskTypesApi.listTaskTypes']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Atualizar tipo de tarefa
         * @param {string} id ID do registro.
         * @param {UpdateTaskTypeRequest} updateTaskTypeRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateTaskType(id: string, updateTaskTypeRequest: UpdateTaskTypeRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TaskType>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateTaskType(id, updateTaskTypeRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TaskTypesApi.updateTaskType']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * TaskTypesApi - factory interface
 */
export const TaskTypesApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = TaskTypesApiFp(configuration)
    return {
        /**
         * Não envie `slug`: ele é gerado a partir do nome.
         * @summary Criar tipo de tarefa
         * @param {TaskTypesApiCreateTaskTypeRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTaskType(requestParameters: TaskTypesApiCreateTaskTypeRequest, options?: RawAxiosRequestConfig): AxiosPromise<TaskType> {
            return localVarFp.createTaskType(requestParameters.createTaskTypeRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Exclusão definitiva. As tarefas que usam o tipo continuam existindo, apontando para um tipo que não existe mais.
         * @summary Excluir tipo de tarefa
         * @param {TaskTypesApiDeleteTaskTypeRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteTaskType(requestParameters: TaskTypesApiDeleteTaskTypeRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.deleteTaskType(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Obter tipo de tarefa
         * @param {TaskTypesApiGetTaskTypeRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTaskType(requestParameters: TaskTypesApiGetTaskTypeRequest, options?: RawAxiosRequestConfig): AxiosPromise<TaskType> {
            return localVarFp.getTaskType(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Sem `page`, devolve uma lista simples com todos os tipos. Com `page`, devolve o envelope paginado.  **Permissão do Service Account:** `tasks.read`
         * @summary Listar tipos de tarefa
         * @param {TaskTypesApiListTaskTypesRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTaskTypes(requestParameters: TaskTypesApiListTaskTypesRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListTaskTypes200Response> {
            return localVarFp.listTaskTypes(requestParameters.page, requestParameters.limit, requestParameters.search, requestParameters.active, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Atualizar tipo de tarefa
         * @param {TaskTypesApiUpdateTaskTypeRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateTaskType(requestParameters: TaskTypesApiUpdateTaskTypeRequest, options?: RawAxiosRequestConfig): AxiosPromise<TaskType> {
            return localVarFp.updateTaskType(requestParameters.id, requestParameters.updateTaskTypeRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createTaskType operation in TaskTypesApi.
 */
export interface TaskTypesApiCreateTaskTypeRequest {
    readonly createTaskTypeRequest: CreateTaskTypeRequest
}

/**
 * Request parameters for deleteTaskType operation in TaskTypesApi.
 */
export interface TaskTypesApiDeleteTaskTypeRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getTaskType operation in TaskTypesApi.
 */
export interface TaskTypesApiGetTaskTypeRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listTaskTypes operation in TaskTypesApi.
 */
export interface TaskTypesApiListTaskTypesRequest {
    /**
     * Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
     */
    readonly page?: number

    /**
     * Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
     */
    readonly limit?: number

    /**
     * Busca no nome.
     */
    readonly search?: string

    /**
     * Filtra por ativos.
     */
    readonly active?: boolean
}

/**
 * Request parameters for updateTaskType operation in TaskTypesApi.
 */
export interface TaskTypesApiUpdateTaskTypeRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly updateTaskTypeRequest: UpdateTaskTypeRequest
}

/**
 * TaskTypesApi - object-oriented interface
 */
export class TaskTypesApi extends BaseAPI {
    /**
     * Não envie `slug`: ele é gerado a partir do nome.
     * @summary Criar tipo de tarefa
     * @param {TaskTypesApiCreateTaskTypeRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createTaskType(requestParameters: TaskTypesApiCreateTaskTypeRequest, options?: RawAxiosRequestConfig) {
        return TaskTypesApiFp(this.configuration).createTaskType(requestParameters.createTaskTypeRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Exclusão definitiva. As tarefas que usam o tipo continuam existindo, apontando para um tipo que não existe mais.
     * @summary Excluir tipo de tarefa
     * @param {TaskTypesApiDeleteTaskTypeRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteTaskType(requestParameters: TaskTypesApiDeleteTaskTypeRequest, options?: RawAxiosRequestConfig) {
        return TaskTypesApiFp(this.configuration).deleteTaskType(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Obter tipo de tarefa
     * @param {TaskTypesApiGetTaskTypeRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getTaskType(requestParameters: TaskTypesApiGetTaskTypeRequest, options?: RawAxiosRequestConfig) {
        return TaskTypesApiFp(this.configuration).getTaskType(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Sem `page`, devolve uma lista simples com todos os tipos. Com `page`, devolve o envelope paginado.  **Permissão do Service Account:** `tasks.read`
     * @summary Listar tipos de tarefa
     * @param {TaskTypesApiListTaskTypesRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listTaskTypes(requestParameters: TaskTypesApiListTaskTypesRequest = {}, options?: RawAxiosRequestConfig) {
        return TaskTypesApiFp(this.configuration).listTaskTypes(requestParameters.page, requestParameters.limit, requestParameters.search, requestParameters.active, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Atualizar tipo de tarefa
     * @param {TaskTypesApiUpdateTaskTypeRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateTaskType(requestParameters: TaskTypesApiUpdateTaskTypeRequest, options?: RawAxiosRequestConfig) {
        return TaskTypesApiFp(this.configuration).updateTaskType(requestParameters.id, requestParameters.updateTaskTypeRequest, options).then((request) => request(this.axios, this.basePath));
    }
}


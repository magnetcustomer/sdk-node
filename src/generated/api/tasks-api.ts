/* tslint:disable */
/* eslint-disable */
/**
 * API da Magnet Customer
 * A API REST da Magnet Customer permite ler e gravar os registros do CRM a partir dos seus sistemas.  # Comece aqui  ## 1. Crie um Service Account  No CRM, abra **Configurações › Service Accounts** (apenas administradores), clique em **Novo service account**, escolha a validade e as permissões, e copie o **Client ID** e o **Client Secret**. O secret aparece uma única vez.  ## 2. Solicite um token  ```bash curl -X POST https://magnetcustomer.net/realms/platform/protocol/openid-connect/token \\   -H \"Content-Type: application/x-www-form-urlencoded\" \\   -d \"grant_type=client_credentials\" \\   -d \"client_id=SEU_CLIENT_ID\" \\   -d \"client_secret=SEU_CLIENT_SECRET\" ```  ```json { \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\", \"expires_in\": 900, \"token_type\": \"Bearer\" } ```  O token vale 15 minutos e este fluxo não tem refresh token: quando vencer, ou ao receber `401`, repita o pedido.  ## 3. Chame a API  Cada conta tem o seu endereço. Troque `sua-conta` pelo subdomínio que você usa para abrir o CRM:  ```bash curl \"https://sua-conta.platform-api.magnetcustomer.com/api/deals?page=1&limit=15\" \\   -H \"Authorization: Bearer SEU_TOKEN\" ```  Requisições com corpo levam também `Content-Type: application/json`.  # Convenções  ## Paginação  Envie sempre `page`. Com ele, toda listagem devolve o mesmo envelope:  ```json { \"docs\": [], \"total\": 132, \"pages\": 9, \"page\": 1, \"limit\": 15 } ```  | Parâmetro | Padrão | Descrição | |---|---|---| | `page` | — | Página, a partir de 1. **Obrigatório na prática** | | `limit` | 15 | Registros por página. Máximo 100: acima disso a API usa 100 | | `sortBy` | varia por recurso | Campo de ordenação | | `sortType` | `desc` | `asc` ou `desc` | | `search` | — | Busca textual, quando o recurso aceita |  Sem `page`, algumas listagens (Contatos, Pipelines, Campos personalizados e os cadastros de apoio, como tipos e situações) devolvem uma lista simples (`[...]`), sem o envelope, e ignoram `limit`. Para percorrer tudo, peça `page=1` e avance até `page` ser igual a `pages`. Uma página além do fim devolve `docs` vazio.  O tamanho de página padrão é 15, com duas exceções: 25 em Leads, Prospects e Clientes, e 100 em Usuários. Um `limit` inválido cai no padrão.  ## Identificadores e datas  Todo ID é um texto de 24 caracteres hexadecimais, como `507f1f77bcf86cd799439011`. Ao gravar, envie a referência como **ID em texto** — nunca o objeto.  No corpo e nas respostas, datas são ISO 8601 em UTC, como `2026-05-15T10:00:00Z`. Nos filtros de data da URL (`minDate`, `createdAt_minDate`, `dateOfExpires_minDate`...), envie um **timestamp em milissegundos**, como `1798761600000`.  ## Listas na URL  Filtros que aceitam vários valores levam colchetes no nome:  ``` /api/contacts?page=1&staffs[]=507f191e810c19729de860eb&staffs[]=507f191e810c19729de860ec ```  Um valor único sem colchetes (`staffs=id`) ou separado por vírgula (`staffs=id1,id2`) também é aceito.  ## Campos ausentes  Campo sem valor costuma vir **ausente** da resposta, não como `null`. Trate a falta da chave como vazio.  ## Campos personalizados  Os campos criados pelo administrador da conta vão na lista `customFields`:  ```json { \"customFields\": [ { \"customField\": \"507f1f77bcf86cd799439014\", \"k\": \"segmento\", \"v\": \"Tecnologia\" } ] } ```  O valor vai em **`v`**. Um item com `value` é aceito sem erro, mas o campo fica vazio. Descubra os campos e os IDs com `GET /api/customfields?page=1&feature=deal` (troque `deal` por `meeting`, `task`, `contact`...). Com `&required=true` vêm só os obrigatórios da conta.  ## Erros  ```json {   \"reason\": \"Missing required parameters\",   \"message\": \"Missing required parameters\",   \"code\": \"VALIDATION_ERROR\",   \"errors\": [ { \"field\": \"title\", \"message\": \"must NOT have fewer than 1 characters\", \"keyword\": \"minLength\" } ] } ```  | Status | Quando | |---|---| | `400` | Corpo ou parâmetro inválido: campo obrigatório ausente, tipo errado, valor fora da lista, ID fora do formato | | `401` | Token ausente, inválido ou vencido. Corpo: `{\"reason\": \"Access Denied\"}` | | `403` | O Service Account não tem a permissão da rota (`type: SA_PERMISSION_DENIED`, com `requiredPermission`) | | `404` | Registro não encontrado | | `409` | O registro não está no estado que a operação exige | | `429` | Limite de requisições excedido. Espere o tempo de `Retry-After` |  ## Permissões  Um Service Account só chama as rotas que as permissões dele liberam. Cada operação desta referência informa a permissão exigida, quando há uma: marque-a ao criar o Service Account. Uma chamada sem a permissão devolve `403` com o nome dela em `requiredPermission`.  Rotas de administração da conta (usuários, perfis, criação de webhooks, configurações) exigem um usuário administrador e não estão disponíveis para Service Accounts; por isso não aparecem aqui.  ## Limite de requisições  Os limites são aplicados por conta. Ao receber `429`, espere os segundos indicados em `Retry-After` e tente de novo com intervalo crescente.  ## Área de trabalho  Em contas com áreas de trabalho, a API define a área do registro pela credencial ou pelo registro pai. Não envie `workspace`.  # Regras de filtro  Dashboards, widgets, predefinições de filtro e automações usam o mesmo formato para dizer quais registros entram: o **conjunto de regras** (`ruleset`).  ```json {   \"condition\": \"AND\",   \"rules\": [     { \"fieldId\": \"deal.amount\", \"operator\": \"greater\", \"value\": 1000 },     {       \"condition\": \"OR\",       \"rules\": [         { \"fieldId\": \"deal.won\", \"operator\": \"false_value\" },         { \"fieldId\": \"deal.stage_name\", \"operator\": \"contains\", \"value\": \"Proposta\" }       ]     }   ] } ```  - **`condition`**: `AND` exige todas as regras; `OR`, pelo menos uma. - **`rules`**: cada item é uma condição (`fieldId`, `operator`, `value`) ou um grupo aninhado (`condition`, `rules`). - **`fieldId`**: o `slug` de um campo. A lista de campos da conta, com os personalizados, vem de `GET /api/resource-keywords`; filtre por recurso com `?modelRef=deal`. - **`operator`**: escolha pelo tipo do campo (`type`, na lista de campos).  | Tipo do campo | Operadores | |---|---| | Texto (`string`) | `equals`, `not_equal`, `contains`, `not_contains`, `starts_with`, `ends_with`, `exists`, `not_exists` | | Número e valor (`number`, `monetary`, `days`) | `equals`, `not_equal`, `greater`, `greater_or_equals`, `less`, `less_or_equals`, `between` (com `valueMin` e `valueMax`) | | Sim ou não (`boolean`) | `true_value`, `false_value` | | Lista (`select`) | `in`, `not_in`, com `value` em lista | | Data (`date`) | `current_day`, `current_week`, `current_month`, `current_year`, `before_day`, `before_week`, `before_month`, `before_year`, `last_n_days`, `next_n_days`, `before_date`, `after_date`, `date_between` |  As regras de um widget não são validadas na gravação: um campo ou operador que não existe é aceito, e o resultado vem vazio. Confira os nomes antes de enviar.  # Webhooks  Para ser avisado quando algo muda no CRM, em vez de consultar a API de tempos em tempos, use webhooks. Um administrador cria o webhook no CRM, em **Integrações › Webhooks**, informando a URL do seu sistema e os eventos. A lista de eventos está em `GET /api/webhooks/triggers`; o formato da entrega, a assinatura e os reenvios estão na seção Webhooks do portal.  # Cobertura  Esta referência cobre Contatos (leads, prospects e clientes), Empresas, Oportunidades, Pipelines, etapas e motivos de perda, Produtos, tabelas de preço e itens de produto, Jornadas, Reuniões, Tarefas, Observações, Tickets, Atendimentos, Usuários, Equipes, Áreas de trabalho, Campos personalizados, Dashboards (com widgets, filtros e resultados), Automações de processo e os eventos de webhook. 
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
import type { FinishTasksRequest } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListTasks200Response } from '../models';
// @ts-ignore
import type { Task } from '../models';
// @ts-ignore
import type { TaskCreate } from '../models';
// @ts-ignore
import type { TaskInput } from '../models';
/**
 * TasksApi - axios parameter creator
 */
export const TasksApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * **Permissão do Service Account:** `tasks.create`
         * @summary Criar tarefa
         * @param {TaskCreate} taskCreate 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTask: async (taskCreate: TaskCreate, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'taskCreate' is not null or undefined
            assertParamExists('createTask', 'taskCreate', taskCreate)
            const localVarPath = `/api/tasks`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(taskCreate, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `tasks.delete`
         * @summary Excluir tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteTask: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteTask', 'id', id)
            const localVarPath = `/api/tasks/{id}`
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
         * @summary Excluir várias tarefas
         * @param {FinishTasksRequest} finishTasksRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteTasks: async (finishTasksRequest: FinishTasksRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'finishTasksRequest' is not null or undefined
            assertParamExists('deleteTasks', 'finishTasksRequest', finishTasksRequest)
            const localVarPath = `/api/tasks/selected/remove`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(finishTasksRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Marca como `finished`. Sem corpo.  **Permissão do Service Account:** `tasks.finish`
         * @summary Concluir tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        finishTask: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('finishTask', 'id', id)
            const localVarPath = `/api/tasks/{id}/finish`
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
         * **Permissão do Service Account:** `tasks.finish`
         * @summary Concluir várias tarefas
         * @param {FinishTasksRequest} finishTasksRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        finishTasks: async (finishTasksRequest: FinishTasksRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'finishTasksRequest' is not null or undefined
            assertParamExists('finishTasks', 'finishTasksRequest', finishTasksRequest)
            const localVarPath = `/api/tasks/selected/finish`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(finishTasksRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `tasks.read`
         * @summary Obter tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTask: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getTask', 'id', id)
            const localVarPath = `/api/tasks/{id}`
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
         * Ordenação padrão: `status` decrescente. Campos aceitos em `sortBy`: `title`, `dateOfExpires`, `createdAt`, `updatedAt`, `status`, `priority`, `type`, `owner`, `dueDate`.  **Permissão do Service Account:** `tasks.list`
         * @summary Listar tarefas
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListTasksSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [owner] ID do responsável.
         * @param {Array<string>} [staffs] Usuários: busca em responsável, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [type] ID do tipo.
         * @param {ListTasksStatusEnum} [status] Situação.
         * @param {ListTasksPriorityEnum} [priority] Prioridade.
         * @param {string} [source] Origem.
         * @param {string} [contact] ID do contato.
         * @param {string} [deal] ID da oportunidade.
         * @param {string} [organization] ID da empresa.
         * @param {number} [dateOfExpiresMinDate] Vencimento a partir de. Timestamp em milissegundos, não data ISO.
         * @param {number} [dateOfExpiresMaxDate] Vencimento até. Timestamp em milissegundos.
         * @param {ListTasksVisualizationEnum} [visualization] Atalho: &#x60;dueDate&#x60; traz as atrasadas.
         * @param {string} [search] Busca em título, detalhes, responsável, contato e oportunidade.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTasks: async (page?: number, limit?: number, sortBy?: string, sortType?: ListTasksSortTypeEnum, owner?: string, staffs?: Array<string>, type?: string, status?: ListTasksStatusEnum, priority?: ListTasksPriorityEnum, source?: string, contact?: string, deal?: string, organization?: string, dateOfExpiresMinDate?: number, dateOfExpiresMaxDate?: number, visualization?: ListTasksVisualizationEnum, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/tasks`;
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

            if (owner !== undefined) {
                localVarQueryParameter['owner'] = owner;
            }

            if (staffs) {
                localVarQueryParameter['staffs[]'] = staffs;
            }

            if (type !== undefined) {
                localVarQueryParameter['type'] = type;
            }

            if (status !== undefined) {
                localVarQueryParameter['status'] = status;
            }

            if (priority !== undefined) {
                localVarQueryParameter['priority'] = priority;
            }

            if (source !== undefined) {
                localVarQueryParameter['source'] = source;
            }

            if (contact !== undefined) {
                localVarQueryParameter['contact'] = contact;
            }

            if (deal !== undefined) {
                localVarQueryParameter['deal'] = deal;
            }

            if (organization !== undefined) {
                localVarQueryParameter['organization'] = organization;
            }

            if (dateOfExpiresMinDate !== undefined) {
                localVarQueryParameter['dateOfExpires_minDate'] = dateOfExpiresMinDate;
            }

            if (dateOfExpiresMaxDate !== undefined) {
                localVarQueryParameter['dateOfExpires_maxDate'] = dateOfExpiresMaxDate;
            }

            if (visualization !== undefined) {
                localVarQueryParameter['visualization'] = visualization;
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
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `tasks.update`
         * @summary Atualizar tarefa
         * @param {string} id ID do registro.
         * @param {TaskInput} taskInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateTask: async (id: string, taskInput: TaskInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateTask', 'id', id)
            // verify required parameter 'taskInput' is not null or undefined
            assertParamExists('updateTask', 'taskInput', taskInput)
            const localVarPath = `/api/tasks/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(taskInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * TasksApi - functional programming interface
 */
export const TasksApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = TasksApiAxiosParamCreator(configuration)
    return {
        /**
         * **Permissão do Service Account:** `tasks.create`
         * @summary Criar tarefa
         * @param {TaskCreate} taskCreate 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createTask(taskCreate: TaskCreate, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Task>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createTask(taskCreate, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TasksApi.createTask']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `tasks.delete`
         * @summary Excluir tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteTask(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteTask(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TasksApi.deleteTask']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Excluir várias tarefas
         * @param {FinishTasksRequest} finishTasksRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteTasks(finishTasksRequest: FinishTasksRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteTasks(finishTasksRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TasksApi.deleteTasks']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Marca como `finished`. Sem corpo.  **Permissão do Service Account:** `tasks.finish`
         * @summary Concluir tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async finishTask(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Task>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.finishTask(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TasksApi.finishTask']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `tasks.finish`
         * @summary Concluir várias tarefas
         * @param {FinishTasksRequest} finishTasksRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async finishTasks(finishTasksRequest: FinishTasksRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.finishTasks(finishTasksRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TasksApi.finishTasks']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `tasks.read`
         * @summary Obter tarefa
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getTask(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Task>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getTask(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TasksApi.getTask']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `status` decrescente. Campos aceitos em `sortBy`: `title`, `dateOfExpires`, `createdAt`, `updatedAt`, `status`, `priority`, `type`, `owner`, `dueDate`.  **Permissão do Service Account:** `tasks.list`
         * @summary Listar tarefas
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListTasksSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [owner] ID do responsável.
         * @param {Array<string>} [staffs] Usuários: busca em responsável, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [type] ID do tipo.
         * @param {ListTasksStatusEnum} [status] Situação.
         * @param {ListTasksPriorityEnum} [priority] Prioridade.
         * @param {string} [source] Origem.
         * @param {string} [contact] ID do contato.
         * @param {string} [deal] ID da oportunidade.
         * @param {string} [organization] ID da empresa.
         * @param {number} [dateOfExpiresMinDate] Vencimento a partir de. Timestamp em milissegundos, não data ISO.
         * @param {number} [dateOfExpiresMaxDate] Vencimento até. Timestamp em milissegundos.
         * @param {ListTasksVisualizationEnum} [visualization] Atalho: &#x60;dueDate&#x60; traz as atrasadas.
         * @param {string} [search] Busca em título, detalhes, responsável, contato e oportunidade.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listTasks(page?: number, limit?: number, sortBy?: string, sortType?: ListTasksSortTypeEnum, owner?: string, staffs?: Array<string>, type?: string, status?: ListTasksStatusEnum, priority?: ListTasksPriorityEnum, source?: string, contact?: string, deal?: string, organization?: string, dateOfExpiresMinDate?: number, dateOfExpiresMaxDate?: number, visualization?: ListTasksVisualizationEnum, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListTasks200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listTasks(page, limit, sortBy, sortType, owner, staffs, type, status, priority, source, contact, deal, organization, dateOfExpiresMinDate, dateOfExpiresMaxDate, visualization, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TasksApi.listTasks']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `tasks.update`
         * @summary Atualizar tarefa
         * @param {string} id ID do registro.
         * @param {TaskInput} taskInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateTask(id: string, taskInput: TaskInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Task>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateTask(id, taskInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TasksApi.updateTask']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * TasksApi - factory interface
 */
export const TasksApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = TasksApiFp(configuration)
    return {
        /**
         * **Permissão do Service Account:** `tasks.create`
         * @summary Criar tarefa
         * @param {TasksApiCreateTaskRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTask(requestParameters: TasksApiCreateTaskRequest, options?: RawAxiosRequestConfig): AxiosPromise<Task> {
            return localVarFp.createTask(requestParameters.taskCreate, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `tasks.delete`
         * @summary Excluir tarefa
         * @param {TasksApiDeleteTaskRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteTask(requestParameters: TasksApiDeleteTaskRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.deleteTask(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Excluir várias tarefas
         * @param {TasksApiDeleteTasksRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteTasks(requestParameters: TasksApiDeleteTasksRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.deleteTasks(requestParameters.finishTasksRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Marca como `finished`. Sem corpo.  **Permissão do Service Account:** `tasks.finish`
         * @summary Concluir tarefa
         * @param {TasksApiFinishTaskRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        finishTask(requestParameters: TasksApiFinishTaskRequest, options?: RawAxiosRequestConfig): AxiosPromise<Task> {
            return localVarFp.finishTask(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `tasks.finish`
         * @summary Concluir várias tarefas
         * @param {TasksApiFinishTasksRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        finishTasks(requestParameters: TasksApiFinishTasksRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.finishTasks(requestParameters.finishTasksRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `tasks.read`
         * @summary Obter tarefa
         * @param {TasksApiGetTaskRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTask(requestParameters: TasksApiGetTaskRequest, options?: RawAxiosRequestConfig): AxiosPromise<Task> {
            return localVarFp.getTask(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `status` decrescente. Campos aceitos em `sortBy`: `title`, `dateOfExpires`, `createdAt`, `updatedAt`, `status`, `priority`, `type`, `owner`, `dueDate`.  **Permissão do Service Account:** `tasks.list`
         * @summary Listar tarefas
         * @param {TasksApiListTasksRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTasks(requestParameters: TasksApiListTasksRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListTasks200Response> {
            return localVarFp.listTasks(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.owner, requestParameters.staffs, requestParameters.type, requestParameters.status, requestParameters.priority, requestParameters.source, requestParameters.contact, requestParameters.deal, requestParameters.organization, requestParameters.dateOfExpiresMinDate, requestParameters.dateOfExpiresMaxDate, requestParameters.visualization, requestParameters.search, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `tasks.update`
         * @summary Atualizar tarefa
         * @param {TasksApiUpdateTaskRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateTask(requestParameters: TasksApiUpdateTaskRequest, options?: RawAxiosRequestConfig): AxiosPromise<Task> {
            return localVarFp.updateTask(requestParameters.id, requestParameters.taskInput, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createTask operation in TasksApi.
 */
export interface TasksApiCreateTaskRequest {
    readonly taskCreate: TaskCreate
}

/**
 * Request parameters for deleteTask operation in TasksApi.
 */
export interface TasksApiDeleteTaskRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for deleteTasks operation in TasksApi.
 */
export interface TasksApiDeleteTasksRequest {
    readonly finishTasksRequest: FinishTasksRequest
}

/**
 * Request parameters for finishTask operation in TasksApi.
 */
export interface TasksApiFinishTaskRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for finishTasks operation in TasksApi.
 */
export interface TasksApiFinishTasksRequest {
    readonly finishTasksRequest: FinishTasksRequest
}

/**
 * Request parameters for getTask operation in TasksApi.
 */
export interface TasksApiGetTaskRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listTasks operation in TasksApi.
 */
export interface TasksApiListTasksRequest {
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
    readonly sortType?: ListTasksSortTypeEnum

    /**
     * ID do responsável.
     */
    readonly owner?: string

    /**
     * Usuários: busca em responsável, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
     */
    readonly staffs?: Array<string>

    /**
     * ID do tipo.
     */
    readonly type?: string

    /**
     * Situação.
     */
    readonly status?: ListTasksStatusEnum

    /**
     * Prioridade.
     */
    readonly priority?: ListTasksPriorityEnum

    /**
     * Origem.
     */
    readonly source?: string

    /**
     * ID do contato.
     */
    readonly contact?: string

    /**
     * ID da oportunidade.
     */
    readonly deal?: string

    /**
     * ID da empresa.
     */
    readonly organization?: string

    /**
     * Vencimento a partir de. Timestamp em milissegundos, não data ISO.
     */
    readonly dateOfExpiresMinDate?: number

    /**
     * Vencimento até. Timestamp em milissegundos.
     */
    readonly dateOfExpiresMaxDate?: number

    /**
     * Atalho: &#x60;dueDate&#x60; traz as atrasadas.
     */
    readonly visualization?: ListTasksVisualizationEnum

    /**
     * Busca em título, detalhes, responsável, contato e oportunidade.
     */
    readonly search?: string
}

/**
 * Request parameters for updateTask operation in TasksApi.
 */
export interface TasksApiUpdateTaskRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly taskInput: TaskInput
}

/**
 * TasksApi - object-oriented interface
 */
export class TasksApi extends BaseAPI {
    /**
     * **Permissão do Service Account:** `tasks.create`
     * @summary Criar tarefa
     * @param {TasksApiCreateTaskRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createTask(requestParameters: TasksApiCreateTaskRequest, options?: RawAxiosRequestConfig) {
        return TasksApiFp(this.configuration).createTask(requestParameters.taskCreate, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `tasks.delete`
     * @summary Excluir tarefa
     * @param {TasksApiDeleteTaskRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteTask(requestParameters: TasksApiDeleteTaskRequest, options?: RawAxiosRequestConfig) {
        return TasksApiFp(this.configuration).deleteTask(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Excluir várias tarefas
     * @param {TasksApiDeleteTasksRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteTasks(requestParameters: TasksApiDeleteTasksRequest, options?: RawAxiosRequestConfig) {
        return TasksApiFp(this.configuration).deleteTasks(requestParameters.finishTasksRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Marca como `finished`. Sem corpo.  **Permissão do Service Account:** `tasks.finish`
     * @summary Concluir tarefa
     * @param {TasksApiFinishTaskRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public finishTask(requestParameters: TasksApiFinishTaskRequest, options?: RawAxiosRequestConfig) {
        return TasksApiFp(this.configuration).finishTask(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `tasks.finish`
     * @summary Concluir várias tarefas
     * @param {TasksApiFinishTasksRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public finishTasks(requestParameters: TasksApiFinishTasksRequest, options?: RawAxiosRequestConfig) {
        return TasksApiFp(this.configuration).finishTasks(requestParameters.finishTasksRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `tasks.read`
     * @summary Obter tarefa
     * @param {TasksApiGetTaskRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getTask(requestParameters: TasksApiGetTaskRequest, options?: RawAxiosRequestConfig) {
        return TasksApiFp(this.configuration).getTask(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `status` decrescente. Campos aceitos em `sortBy`: `title`, `dateOfExpires`, `createdAt`, `updatedAt`, `status`, `priority`, `type`, `owner`, `dueDate`.  **Permissão do Service Account:** `tasks.list`
     * @summary Listar tarefas
     * @param {TasksApiListTasksRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listTasks(requestParameters: TasksApiListTasksRequest = {}, options?: RawAxiosRequestConfig) {
        return TasksApiFp(this.configuration).listTasks(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.owner, requestParameters.staffs, requestParameters.type, requestParameters.status, requestParameters.priority, requestParameters.source, requestParameters.contact, requestParameters.deal, requestParameters.organization, requestParameters.dateOfExpiresMinDate, requestParameters.dateOfExpiresMaxDate, requestParameters.visualization, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só os campos que mudam.  **Permissão do Service Account:** `tasks.update`
     * @summary Atualizar tarefa
     * @param {TasksApiUpdateTaskRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateTask(requestParameters: TasksApiUpdateTaskRequest, options?: RawAxiosRequestConfig) {
        return TasksApiFp(this.configuration).updateTask(requestParameters.id, requestParameters.taskInput, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListTasksSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListTasksSortTypeEnum = typeof ListTasksSortTypeEnum[keyof typeof ListTasksSortTypeEnum];
export const ListTasksStatusEnum = {
    pending: 'pending',
    finished: 'finished',
} as const;
export type ListTasksStatusEnum = typeof ListTasksStatusEnum[keyof typeof ListTasksStatusEnum];
export const ListTasksPriorityEnum = {
    p1: 'p1',
    p2: 'p2',
    p3: 'p3',
    p4: 'p4',
} as const;
export type ListTasksPriorityEnum = typeof ListTasksPriorityEnum[keyof typeof ListTasksPriorityEnum];
export const ListTasksVisualizationEnum = {
    all: 'all',
    dueDateToday: 'dueDateToday',
    dueDate: 'dueDate',
    pending: 'pending',
    finished: 'finished',
} as const;
export type ListTasksVisualizationEnum = typeof ListTasksVisualizationEnum[keyof typeof ListTasksVisualizationEnum];

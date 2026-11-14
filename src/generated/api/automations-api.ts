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
import type { Automation } from '../models';
// @ts-ignore
import type { AutomationInput } from '../models';
// @ts-ignore
import type { CreateAutomationRequest } from '../models';
// @ts-ignore
import type { GetAutomationSchedule200Response } from '../models';
// @ts-ignore
import type { GetAutomationStatistics200Response } from '../models';
// @ts-ignore
import type { ListAutomationActionTemplates200ResponseInner } from '../models';
// @ts-ignore
import type { ListAutomationEntities200ResponseInner } from '../models';
// @ts-ignore
import type { ListAutomationLogs200Response } from '../models';
// @ts-ignore
import type { ListAutomations200Response } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { SimulateAutomationDraft200Response } from '../models';
// @ts-ignore
import type { SimulateAutomationDraftRequest } from '../models';
// @ts-ignore
import type { UpdateAutomationStatus200Response } from '../models';
// @ts-ignore
import type { UpdateAutomationStatusRequest } from '../models';
/**
 * AutomationsApi - axios parameter creator
 */
export const AutomationsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * O único campo obrigatório é `title`.  **Atenção:** sem `status`, a automação nasce `WAITING`, ou seja, ativa: uma automação por filtro executa no próximo horário agendado, e uma por evento, no próximo evento. Para criar pausada, envie `status: FREEZE`, confira o alcance com `POST /api/processautomations/{id}/simulate` e só então ative.  A exclusão de automações é feita por um administrador, na tela do CRM.  **Permissão do Service Account:** `automations.create`
         * @summary Criar automação
         * @param {CreateAutomationRequest} createAutomationRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createAutomation: async (createAutomationRequest: CreateAutomationRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createAutomationRequest' is not null or undefined
            assertParamExists('createAutomation', 'createAutomationRequest', createAutomationRequest)
            const localVarPath = `/api/processautomations`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createAutomationRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `automations.read`
         * @summary Obter automação
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAutomation: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getAutomation', 'id', id)
            const localVarPath = `/api/processautomations/{id}`
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
         * Próxima execução e as execuções recentes.
         * @summary Obter a agenda da automação
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAutomationSchedule: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getAutomationSchedule', 'id', id)
            const localVarPath = `/api/processautomations/{id}/schedule`
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
         * 
         * @summary Obter estatísticas da automação
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAutomationStatistics: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getAutomationStatistics', 'id', id)
            const localVarPath = `/api/processautomations/{id}/statistics`
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
         * Ações prontas, com a configuração padrão (`defaultConfig`), as variáveis disponíveis (`availableVariables`) e os recursos com que cada uma é compatível.
         * @summary Listar modelos de ação
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAutomationActionTemplates: async (options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/processautomations/templates/actions`;
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
         * Para cada recurso: os eventos que podem disparar uma automação (`supportedEvents`) e os campos que podem entrar em `fieldConditions` (`availableFields`).  **Permissão do Service Account:** `automations.read`
         * @summary Listar recursos, eventos e campos aceitos
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAutomationEntities: async (options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/processautomations/entities`;
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
         * Tamanho de página padrão: 25.  **Permissão do Service Account:** `automations.read-logs`
         * @summary Listar o histórico de execução
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAutomationLogs: async (id: string, page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('listAutomationLogs', 'id', id)
            const localVarPath = `/api/processautomations/{id}/logs`
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

            if (page !== undefined) {
                localVarQueryParameter['page'] = page;
            }

            if (limit !== undefined) {
                localVarQueryParameter['limit'] = limit;
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
         * Tamanho de página padrão: 15.  **Permissão do Service Account:** `automations.list`
         * @summary Listar automações
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListAutomationsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [search] Busca no nome.
         * @param {string} [folderId] ID da pasta.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAutomations: async (page?: number, limit?: number, sortBy?: string, sortType?: ListAutomationsSortTypeEnum, search?: string, folderId?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/processautomations`;
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

            if (search !== undefined) {
                localVarQueryParameter['search'] = search;
            }

            if (folderId !== undefined) {
                localVarQueryParameter['folderId'] = folderId;
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
         * Calcula o alcance atual da automação, sem executar ações.
         * @summary Simular uma automação gravada
         * @param {string} id ID do registro.
         * @param {object} [body] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        simulateAutomation: async (id: string, body?: object, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('simulateAutomation', 'id', id)
            const localVarPath = `/api/processautomations/{id}/simulate`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(body, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Calcula quantos registros a automação alcançaria, sem gravar nada e sem executar ações.  **Permissão do Service Account:** `automations.create`
         * @summary Simular uma automação antes de gravar
         * @param {SimulateAutomationDraftRequest} simulateAutomationDraftRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        simulateAutomationDraft: async (simulateAutomationDraftRequest: SimulateAutomationDraftRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'simulateAutomationDraftRequest' is not null or undefined
            assertParamExists('simulateAutomationDraft', 'simulateAutomationDraftRequest', simulateAutomationDraftRequest)
            const localVarPath = `/api/processautomations/simulate-draft`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(simulateAutomationDraftRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Envie a automação com os campos que mudam. `status` não muda por aqui: use a operação de situação.  **Permissão do Service Account:** `automations.update`
         * @summary Atualizar automação
         * @param {string} id ID do registro.
         * @param {AutomationInput} automationInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateAutomation: async (id: string, automationInput: AutomationInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateAutomation', 'id', id)
            // verify required parameter 'automationInput' is not null or undefined
            assertParamExists('updateAutomation', 'automationInput', automationInput)
            const localVarPath = `/api/processautomations/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(automationInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Transições aceitas: de `WAITING` para `FREEZE`, `FINISHED` ou `RECURRENCE`; de `FREEZE` para `WAITING` ou `RECURRENCE`; de `RECURRENCE` para `FREEZE`, `WAITING` ou `FINISHED`; de `FINISHED` para `WAITING` ou `RECURRENCE`. Fora disso a resposta é `400` com `allowedTransitions`.
         * @summary Ativar, pausar ou concluir automação
         * @param {string} id ID do registro.
         * @param {UpdateAutomationStatusRequest} updateAutomationStatusRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateAutomationStatus: async (id: string, updateAutomationStatusRequest: UpdateAutomationStatusRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateAutomationStatus', 'id', id)
            // verify required parameter 'updateAutomationStatusRequest' is not null or undefined
            assertParamExists('updateAutomationStatus', 'updateAutomationStatusRequest', updateAutomationStatusRequest)
            const localVarPath = `/api/processautomations/{id}/status`
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateAutomationStatusRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * AutomationsApi - functional programming interface
 */
export const AutomationsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = AutomationsApiAxiosParamCreator(configuration)
    return {
        /**
         * O único campo obrigatório é `title`.  **Atenção:** sem `status`, a automação nasce `WAITING`, ou seja, ativa: uma automação por filtro executa no próximo horário agendado, e uma por evento, no próximo evento. Para criar pausada, envie `status: FREEZE`, confira o alcance com `POST /api/processautomations/{id}/simulate` e só então ative.  A exclusão de automações é feita por um administrador, na tela do CRM.  **Permissão do Service Account:** `automations.create`
         * @summary Criar automação
         * @param {CreateAutomationRequest} createAutomationRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createAutomation(createAutomationRequest: CreateAutomationRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Automation>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createAutomation(createAutomationRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.createAutomation']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `automations.read`
         * @summary Obter automação
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getAutomation(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Automation>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getAutomation(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.getAutomation']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Próxima execução e as execuções recentes.
         * @summary Obter a agenda da automação
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getAutomationSchedule(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetAutomationSchedule200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getAutomationSchedule(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.getAutomationSchedule']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Obter estatísticas da automação
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getAutomationStatistics(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetAutomationStatistics200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getAutomationStatistics(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.getAutomationStatistics']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ações prontas, com a configuração padrão (`defaultConfig`), as variáveis disponíveis (`availableVariables`) e os recursos com que cada uma é compatível.
         * @summary Listar modelos de ação
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listAutomationActionTemplates(options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<ListAutomationActionTemplates200ResponseInner>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listAutomationActionTemplates(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.listAutomationActionTemplates']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Para cada recurso: os eventos que podem disparar uma automação (`supportedEvents`) e os campos que podem entrar em `fieldConditions` (`availableFields`).  **Permissão do Service Account:** `automations.read`
         * @summary Listar recursos, eventos e campos aceitos
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listAutomationEntities(options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<ListAutomationEntities200ResponseInner>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listAutomationEntities(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.listAutomationEntities']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Tamanho de página padrão: 25.  **Permissão do Service Account:** `automations.read-logs`
         * @summary Listar o histórico de execução
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listAutomationLogs(id: string, page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListAutomationLogs200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listAutomationLogs(id, page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.listAutomationLogs']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Tamanho de página padrão: 15.  **Permissão do Service Account:** `automations.list`
         * @summary Listar automações
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListAutomationsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [search] Busca no nome.
         * @param {string} [folderId] ID da pasta.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listAutomations(page?: number, limit?: number, sortBy?: string, sortType?: ListAutomationsSortTypeEnum, search?: string, folderId?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListAutomations200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listAutomations(page, limit, sortBy, sortType, search, folderId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.listAutomations']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Calcula o alcance atual da automação, sem executar ações.
         * @summary Simular uma automação gravada
         * @param {string} id ID do registro.
         * @param {object} [body] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async simulateAutomation(id: string, body?: object, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<SimulateAutomationDraft200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.simulateAutomation(id, body, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.simulateAutomation']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Calcula quantos registros a automação alcançaria, sem gravar nada e sem executar ações.  **Permissão do Service Account:** `automations.create`
         * @summary Simular uma automação antes de gravar
         * @param {SimulateAutomationDraftRequest} simulateAutomationDraftRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async simulateAutomationDraft(simulateAutomationDraftRequest: SimulateAutomationDraftRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<SimulateAutomationDraft200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.simulateAutomationDraft(simulateAutomationDraftRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.simulateAutomationDraft']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie a automação com os campos que mudam. `status` não muda por aqui: use a operação de situação.  **Permissão do Service Account:** `automations.update`
         * @summary Atualizar automação
         * @param {string} id ID do registro.
         * @param {AutomationInput} automationInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateAutomation(id: string, automationInput: AutomationInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Automation>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateAutomation(id, automationInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.updateAutomation']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Transições aceitas: de `WAITING` para `FREEZE`, `FINISHED` ou `RECURRENCE`; de `FREEZE` para `WAITING` ou `RECURRENCE`; de `RECURRENCE` para `FREEZE`, `WAITING` ou `FINISHED`; de `FINISHED` para `WAITING` ou `RECURRENCE`. Fora disso a resposta é `400` com `allowedTransitions`.
         * @summary Ativar, pausar ou concluir automação
         * @param {string} id ID do registro.
         * @param {UpdateAutomationStatusRequest} updateAutomationStatusRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateAutomationStatus(id: string, updateAutomationStatusRequest: UpdateAutomationStatusRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<UpdateAutomationStatus200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateAutomationStatus(id, updateAutomationStatusRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AutomationsApi.updateAutomationStatus']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * AutomationsApi - factory interface
 */
export const AutomationsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = AutomationsApiFp(configuration)
    return {
        /**
         * O único campo obrigatório é `title`.  **Atenção:** sem `status`, a automação nasce `WAITING`, ou seja, ativa: uma automação por filtro executa no próximo horário agendado, e uma por evento, no próximo evento. Para criar pausada, envie `status: FREEZE`, confira o alcance com `POST /api/processautomations/{id}/simulate` e só então ative.  A exclusão de automações é feita por um administrador, na tela do CRM.  **Permissão do Service Account:** `automations.create`
         * @summary Criar automação
         * @param {AutomationsApiCreateAutomationRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createAutomation(requestParameters: AutomationsApiCreateAutomationRequest, options?: RawAxiosRequestConfig): AxiosPromise<Automation> {
            return localVarFp.createAutomation(requestParameters.createAutomationRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `automations.read`
         * @summary Obter automação
         * @param {AutomationsApiGetAutomationRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAutomation(requestParameters: AutomationsApiGetAutomationRequest, options?: RawAxiosRequestConfig): AxiosPromise<Automation> {
            return localVarFp.getAutomation(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Próxima execução e as execuções recentes.
         * @summary Obter a agenda da automação
         * @param {AutomationsApiGetAutomationScheduleRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAutomationSchedule(requestParameters: AutomationsApiGetAutomationScheduleRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetAutomationSchedule200Response> {
            return localVarFp.getAutomationSchedule(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Obter estatísticas da automação
         * @param {AutomationsApiGetAutomationStatisticsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAutomationStatistics(requestParameters: AutomationsApiGetAutomationStatisticsRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetAutomationStatistics200Response> {
            return localVarFp.getAutomationStatistics(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Ações prontas, com a configuração padrão (`defaultConfig`), as variáveis disponíveis (`availableVariables`) e os recursos com que cada uma é compatível.
         * @summary Listar modelos de ação
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAutomationActionTemplates(options?: RawAxiosRequestConfig): AxiosPromise<Array<ListAutomationActionTemplates200ResponseInner>> {
            return localVarFp.listAutomationActionTemplates(options).then((request) => request(axios, basePath));
        },
        /**
         * Para cada recurso: os eventos que podem disparar uma automação (`supportedEvents`) e os campos que podem entrar em `fieldConditions` (`availableFields`).  **Permissão do Service Account:** `automations.read`
         * @summary Listar recursos, eventos e campos aceitos
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAutomationEntities(options?: RawAxiosRequestConfig): AxiosPromise<Array<ListAutomationEntities200ResponseInner>> {
            return localVarFp.listAutomationEntities(options).then((request) => request(axios, basePath));
        },
        /**
         * Tamanho de página padrão: 25.  **Permissão do Service Account:** `automations.read-logs`
         * @summary Listar o histórico de execução
         * @param {AutomationsApiListAutomationLogsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAutomationLogs(requestParameters: AutomationsApiListAutomationLogsRequest, options?: RawAxiosRequestConfig): AxiosPromise<ListAutomationLogs200Response> {
            return localVarFp.listAutomationLogs(requestParameters.id, requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Tamanho de página padrão: 15.  **Permissão do Service Account:** `automations.list`
         * @summary Listar automações
         * @param {AutomationsApiListAutomationsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAutomations(requestParameters: AutomationsApiListAutomationsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListAutomations200Response> {
            return localVarFp.listAutomations(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.search, requestParameters.folderId, options).then((request) => request(axios, basePath));
        },
        /**
         * Calcula o alcance atual da automação, sem executar ações.
         * @summary Simular uma automação gravada
         * @param {AutomationsApiSimulateAutomationRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        simulateAutomation(requestParameters: AutomationsApiSimulateAutomationRequest, options?: RawAxiosRequestConfig): AxiosPromise<SimulateAutomationDraft200Response> {
            return localVarFp.simulateAutomation(requestParameters.id, requestParameters.body, options).then((request) => request(axios, basePath));
        },
        /**
         * Calcula quantos registros a automação alcançaria, sem gravar nada e sem executar ações.  **Permissão do Service Account:** `automations.create`
         * @summary Simular uma automação antes de gravar
         * @param {AutomationsApiSimulateAutomationDraftRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        simulateAutomationDraft(requestParameters: AutomationsApiSimulateAutomationDraftRequest, options?: RawAxiosRequestConfig): AxiosPromise<SimulateAutomationDraft200Response> {
            return localVarFp.simulateAutomationDraft(requestParameters.simulateAutomationDraftRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie a automação com os campos que mudam. `status` não muda por aqui: use a operação de situação.  **Permissão do Service Account:** `automations.update`
         * @summary Atualizar automação
         * @param {AutomationsApiUpdateAutomationRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateAutomation(requestParameters: AutomationsApiUpdateAutomationRequest, options?: RawAxiosRequestConfig): AxiosPromise<Automation> {
            return localVarFp.updateAutomation(requestParameters.id, requestParameters.automationInput, options).then((request) => request(axios, basePath));
        },
        /**
         * Transições aceitas: de `WAITING` para `FREEZE`, `FINISHED` ou `RECURRENCE`; de `FREEZE` para `WAITING` ou `RECURRENCE`; de `RECURRENCE` para `FREEZE`, `WAITING` ou `FINISHED`; de `FINISHED` para `WAITING` ou `RECURRENCE`. Fora disso a resposta é `400` com `allowedTransitions`.
         * @summary Ativar, pausar ou concluir automação
         * @param {AutomationsApiUpdateAutomationStatusRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateAutomationStatus(requestParameters: AutomationsApiUpdateAutomationStatusRequest, options?: RawAxiosRequestConfig): AxiosPromise<UpdateAutomationStatus200Response> {
            return localVarFp.updateAutomationStatus(requestParameters.id, requestParameters.updateAutomationStatusRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createAutomation operation in AutomationsApi.
 */
export interface AutomationsApiCreateAutomationRequest {
    readonly createAutomationRequest: CreateAutomationRequest
}

/**
 * Request parameters for getAutomation operation in AutomationsApi.
 */
export interface AutomationsApiGetAutomationRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getAutomationSchedule operation in AutomationsApi.
 */
export interface AutomationsApiGetAutomationScheduleRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getAutomationStatistics operation in AutomationsApi.
 */
export interface AutomationsApiGetAutomationStatisticsRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listAutomationLogs operation in AutomationsApi.
 */
export interface AutomationsApiListAutomationLogsRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    /**
     * Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
     */
    readonly page?: number

    /**
     * Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
     */
    readonly limit?: number
}

/**
 * Request parameters for listAutomations operation in AutomationsApi.
 */
export interface AutomationsApiListAutomationsRequest {
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
    readonly sortType?: ListAutomationsSortTypeEnum

    /**
     * Busca no nome.
     */
    readonly search?: string

    /**
     * ID da pasta.
     */
    readonly folderId?: string
}

/**
 * Request parameters for simulateAutomation operation in AutomationsApi.
 */
export interface AutomationsApiSimulateAutomationRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly body?: object
}

/**
 * Request parameters for simulateAutomationDraft operation in AutomationsApi.
 */
export interface AutomationsApiSimulateAutomationDraftRequest {
    readonly simulateAutomationDraftRequest: SimulateAutomationDraftRequest
}

/**
 * Request parameters for updateAutomation operation in AutomationsApi.
 */
export interface AutomationsApiUpdateAutomationRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly automationInput: AutomationInput
}

/**
 * Request parameters for updateAutomationStatus operation in AutomationsApi.
 */
export interface AutomationsApiUpdateAutomationStatusRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly updateAutomationStatusRequest: UpdateAutomationStatusRequest
}

/**
 * AutomationsApi - object-oriented interface
 */
export class AutomationsApi extends BaseAPI {
    /**
     * O único campo obrigatório é `title`.  **Atenção:** sem `status`, a automação nasce `WAITING`, ou seja, ativa: uma automação por filtro executa no próximo horário agendado, e uma por evento, no próximo evento. Para criar pausada, envie `status: FREEZE`, confira o alcance com `POST /api/processautomations/{id}/simulate` e só então ative.  A exclusão de automações é feita por um administrador, na tela do CRM.  **Permissão do Service Account:** `automations.create`
     * @summary Criar automação
     * @param {AutomationsApiCreateAutomationRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createAutomation(requestParameters: AutomationsApiCreateAutomationRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).createAutomation(requestParameters.createAutomationRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `automations.read`
     * @summary Obter automação
     * @param {AutomationsApiGetAutomationRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getAutomation(requestParameters: AutomationsApiGetAutomationRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).getAutomation(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Próxima execução e as execuções recentes.
     * @summary Obter a agenda da automação
     * @param {AutomationsApiGetAutomationScheduleRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getAutomationSchedule(requestParameters: AutomationsApiGetAutomationScheduleRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).getAutomationSchedule(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Obter estatísticas da automação
     * @param {AutomationsApiGetAutomationStatisticsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getAutomationStatistics(requestParameters: AutomationsApiGetAutomationStatisticsRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).getAutomationStatistics(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ações prontas, com a configuração padrão (`defaultConfig`), as variáveis disponíveis (`availableVariables`) e os recursos com que cada uma é compatível.
     * @summary Listar modelos de ação
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listAutomationActionTemplates(options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).listAutomationActionTemplates(options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Para cada recurso: os eventos que podem disparar uma automação (`supportedEvents`) e os campos que podem entrar em `fieldConditions` (`availableFields`).  **Permissão do Service Account:** `automations.read`
     * @summary Listar recursos, eventos e campos aceitos
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listAutomationEntities(options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).listAutomationEntities(options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Tamanho de página padrão: 25.  **Permissão do Service Account:** `automations.read-logs`
     * @summary Listar o histórico de execução
     * @param {AutomationsApiListAutomationLogsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listAutomationLogs(requestParameters: AutomationsApiListAutomationLogsRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).listAutomationLogs(requestParameters.id, requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Tamanho de página padrão: 15.  **Permissão do Service Account:** `automations.list`
     * @summary Listar automações
     * @param {AutomationsApiListAutomationsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listAutomations(requestParameters: AutomationsApiListAutomationsRequest = {}, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).listAutomations(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.search, requestParameters.folderId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Calcula o alcance atual da automação, sem executar ações.
     * @summary Simular uma automação gravada
     * @param {AutomationsApiSimulateAutomationRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public simulateAutomation(requestParameters: AutomationsApiSimulateAutomationRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).simulateAutomation(requestParameters.id, requestParameters.body, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Calcula quantos registros a automação alcançaria, sem gravar nada e sem executar ações.  **Permissão do Service Account:** `automations.create`
     * @summary Simular uma automação antes de gravar
     * @param {AutomationsApiSimulateAutomationDraftRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public simulateAutomationDraft(requestParameters: AutomationsApiSimulateAutomationDraftRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).simulateAutomationDraft(requestParameters.simulateAutomationDraftRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie a automação com os campos que mudam. `status` não muda por aqui: use a operação de situação.  **Permissão do Service Account:** `automations.update`
     * @summary Atualizar automação
     * @param {AutomationsApiUpdateAutomationRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateAutomation(requestParameters: AutomationsApiUpdateAutomationRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).updateAutomation(requestParameters.id, requestParameters.automationInput, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Transições aceitas: de `WAITING` para `FREEZE`, `FINISHED` ou `RECURRENCE`; de `FREEZE` para `WAITING` ou `RECURRENCE`; de `RECURRENCE` para `FREEZE`, `WAITING` ou `FINISHED`; de `FINISHED` para `WAITING` ou `RECURRENCE`. Fora disso a resposta é `400` com `allowedTransitions`.
     * @summary Ativar, pausar ou concluir automação
     * @param {AutomationsApiUpdateAutomationStatusRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateAutomationStatus(requestParameters: AutomationsApiUpdateAutomationStatusRequest, options?: RawAxiosRequestConfig) {
        return AutomationsApiFp(this.configuration).updateAutomationStatus(requestParameters.id, requestParameters.updateAutomationStatusRequest, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListAutomationsSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListAutomationsSortTypeEnum = typeof ListAutomationsSortTypeEnum[keyof typeof ListAutomationsSortTypeEnum];

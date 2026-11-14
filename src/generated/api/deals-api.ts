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
import type { CloseDealRequest } from '../models';
// @ts-ignore
import type { Deal } from '../models';
// @ts-ignore
import type { DealCreate } from '../models';
// @ts-ignore
import type { DealInput } from '../models';
// @ts-ignore
import type { GetDealStageHistory200Response } from '../models';
// @ts-ignore
import type { ListDeals200Response } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { MoveDealStageRequest } from '../models';
// @ts-ignore
import type { ReopenDealRequest } from '../models';
// @ts-ignore
import type { ValidateDeal200Response } from '../models';
/**
 * DealsApi - axios parameter creator
 */
export const DealsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Envie `won: true` para ganha, ou `lost: true` com `lostReason` para perdida.
         * @summary Fechar como ganha ou perdida
         * @param {string} id ID do registro.
         * @param {CloseDealRequest} closeDealRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        closeDeal: async (id: string, closeDealRequest: CloseDealRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('closeDeal', 'id', id)
            // verify required parameter 'closeDealRequest' is not null or undefined
            assertParamExists('closeDeal', 'closeDealRequest', closeDealRequest)
            const localVarPath = `/api/deals/{id}/close`
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
            localVarRequestOptions.data = serializeDataIfNeeded(closeDealRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Se `staff` não for enviado, a API usa o usuário da credencial.  A criação é idempotente por 5 minutos: reenviar o mesmo corpo não duplica o registro. Para controlar a chave, envie o cabeçalho `Idempotency-Key`.  **Permissão do Service Account:** `deals.create`
         * @summary Criar oportunidade
         * @param {DealCreate} dealCreate 
         * @param {string} [idempotencyKey] Chave única da operação (UUID). Repita a mesma chave nas novas tentativas.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createDeal: async (dealCreate: DealCreate, idempotencyKey?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dealCreate' is not null or undefined
            assertParamExists('createDeal', 'dealCreate', dealCreate)
            const localVarPath = `/api/deals`;
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

            if (idempotencyKey != null) {
                localVarHeaderParameter['Idempotency-Key'] = String(idempotencyKey);
            }
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(dealCreate, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Exclusão lógica (`active: false`). Responde `400` com `code: DEAL_HAS_LINKED_JOURNEYS` se houver jornadas ativas vinculadas.  **Permissão do Service Account:** `deals.delete`
         * @summary Excluir oportunidade
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteDeal: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteDeal', 'id', id)
            const localVarPath = `/api/deals/{id}`
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
         * No detalhe, `pipeline` vem como objeto (`_id`, `title`) e `contact` vem com o cadastro completo.  **Permissão do Service Account:** `deals.read`
         * @summary Obter oportunidade
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDeal: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getDeal', 'id', id)
            const localVarPath = `/api/deals/{id}`
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
         * Uma entrada por passagem em etapa, com a duração de cada uma e os totais.
         * @summary Histórico de etapas
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDealStageHistory: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getDealStageHistory', 'id', id)
            const localVarPath = `/api/deals/{id}/stage-history`
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
         * Ordenação padrão: `createdAt` decrescente.  **Permissão do Service Account:** `deals.list`
         * @summary Listar oportunidades
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListDealsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [pipeline] ID do pipeline.
         * @param {string} [stage] ID da etapa.
         * @param {string} [contact] ID do contato.
         * @param {string} [organization] ID da empresa.
         * @param {Array<string>} [staffs] Usuários: busca em responsável, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {Array<string>} [contacts] Vários contatos. Lista de IDs (&#x60;?contacts[]&#x3D;id1&amp;contacts[]&#x3D;id2&#x60;).
         * @param {number} [minDate] Fechamento previsto (&#x60;expectedCloseDate&#x60;) a partir de. Timestamp em milissegundos, não data ISO.
         * @param {number} [maxDate] Fechamento previsto até. Timestamp em milissegundos.
         * @param {string} [search] Busca em título, nome e e-mail do contato.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listDeals: async (page?: number, limit?: number, sortBy?: string, sortType?: ListDealsSortTypeEnum, pipeline?: string, stage?: string, contact?: string, organization?: string, staffs?: Array<string>, contacts?: Array<string>, minDate?: number, maxDate?: number, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/deals`;
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

            if (pipeline !== undefined) {
                localVarQueryParameter['pipeline'] = pipeline;
            }

            if (stage !== undefined) {
                localVarQueryParameter['stage'] = stage;
            }

            if (contact !== undefined) {
                localVarQueryParameter['contact'] = contact;
            }

            if (organization !== undefined) {
                localVarQueryParameter['organization'] = organization;
            }

            if (staffs) {
                localVarQueryParameter['staffs[]'] = staffs;
            }

            if (contacts) {
                localVarQueryParameter['contacts[]'] = contacts;
            }

            if (minDate !== undefined) {
                localVarQueryParameter['minDate'] = minDate;
            }

            if (maxDate !== undefined) {
                localVarQueryParameter['maxDate'] = maxDate;
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
         * Devolve a oportunidade já na nova etapa.
         * @summary Mover de etapa
         * @param {string} id ID do registro.
         * @param {MoveDealStageRequest} moveDealStageRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        moveDealStage: async (id: string, moveDealStageRequest: MoveDealStageRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('moveDealStage', 'id', id)
            // verify required parameter 'moveDealStageRequest' is not null or undefined
            assertParamExists('moveDealStage', 'moveDealStageRequest', moveDealStageRequest)
            const localVarPath = `/api/deals/{id}/stage`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'PATCH', ...baseOptions, ...options};
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
            localVarRequestOptions.data = serializeDataIfNeeded(moveDealStageRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Reabre uma oportunidade ganha ou perdida. Se ela já estiver aberta, a resposta é `200` com a oportunidade sem alteração.
         * @summary Reabrir oportunidade
         * @param {string} id ID do registro.
         * @param {ReopenDealRequest} [reopenDealRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        reopenDeal: async (id: string, reopenDealRequest?: ReopenDealRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('reopenDeal', 'id', id)
            const localVarPath = `/api/deals/{id}/reopen`
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
            localVarRequestOptions.data = serializeDataIfNeeded(reopenDealRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `deals.update`
         * @summary Atualizar oportunidade
         * @param {string} id ID do registro.
         * @param {DealInput} dealInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateDeal: async (id: string, dealInput: DealInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateDeal', 'id', id)
            // verify required parameter 'dealInput' is not null or undefined
            assertParamExists('updateDeal', 'dealInput', dealInput)
            const localVarPath = `/api/deals/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(dealInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Diz se a oportunidade tem ações ou campos obrigatórios pendentes. Cada lista traz o que falta; vazia quando não falta nada.
         * @summary Validar pendências antes de fechar
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        validateDeal: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('validateDeal', 'id', id)
            const localVarPath = `/api/deals/{id}/validate`
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
    }
};

/**
 * DealsApi - functional programming interface
 */
export const DealsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = DealsApiAxiosParamCreator(configuration)
    return {
        /**
         * Envie `won: true` para ganha, ou `lost: true` com `lostReason` para perdida.
         * @summary Fechar como ganha ou perdida
         * @param {string} id ID do registro.
         * @param {CloseDealRequest} closeDealRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async closeDeal(id: string, closeDealRequest: CloseDealRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Deal>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.closeDeal(id, closeDealRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.closeDeal']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Se `staff` não for enviado, a API usa o usuário da credencial.  A criação é idempotente por 5 minutos: reenviar o mesmo corpo não duplica o registro. Para controlar a chave, envie o cabeçalho `Idempotency-Key`.  **Permissão do Service Account:** `deals.create`
         * @summary Criar oportunidade
         * @param {DealCreate} dealCreate 
         * @param {string} [idempotencyKey] Chave única da operação (UUID). Repita a mesma chave nas novas tentativas.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createDeal(dealCreate: DealCreate, idempotencyKey?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Deal>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createDeal(dealCreate, idempotencyKey, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.createDeal']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Exclusão lógica (`active: false`). Responde `400` com `code: DEAL_HAS_LINKED_JOURNEYS` se houver jornadas ativas vinculadas.  **Permissão do Service Account:** `deals.delete`
         * @summary Excluir oportunidade
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteDeal(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Deal>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteDeal(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.deleteDeal']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * No detalhe, `pipeline` vem como objeto (`_id`, `title`) e `contact` vem com o cadastro completo.  **Permissão do Service Account:** `deals.read`
         * @summary Obter oportunidade
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getDeal(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Deal>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getDeal(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.getDeal']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Uma entrada por passagem em etapa, com a duração de cada uma e os totais.
         * @summary Histórico de etapas
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getDealStageHistory(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetDealStageHistory200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getDealStageHistory(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.getDealStageHistory']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `createdAt` decrescente.  **Permissão do Service Account:** `deals.list`
         * @summary Listar oportunidades
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListDealsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [pipeline] ID do pipeline.
         * @param {string} [stage] ID da etapa.
         * @param {string} [contact] ID do contato.
         * @param {string} [organization] ID da empresa.
         * @param {Array<string>} [staffs] Usuários: busca em responsável, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {Array<string>} [contacts] Vários contatos. Lista de IDs (&#x60;?contacts[]&#x3D;id1&amp;contacts[]&#x3D;id2&#x60;).
         * @param {number} [minDate] Fechamento previsto (&#x60;expectedCloseDate&#x60;) a partir de. Timestamp em milissegundos, não data ISO.
         * @param {number} [maxDate] Fechamento previsto até. Timestamp em milissegundos.
         * @param {string} [search] Busca em título, nome e e-mail do contato.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listDeals(page?: number, limit?: number, sortBy?: string, sortType?: ListDealsSortTypeEnum, pipeline?: string, stage?: string, contact?: string, organization?: string, staffs?: Array<string>, contacts?: Array<string>, minDate?: number, maxDate?: number, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListDeals200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listDeals(page, limit, sortBy, sortType, pipeline, stage, contact, organization, staffs, contacts, minDate, maxDate, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.listDeals']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Devolve a oportunidade já na nova etapa.
         * @summary Mover de etapa
         * @param {string} id ID do registro.
         * @param {MoveDealStageRequest} moveDealStageRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async moveDealStage(id: string, moveDealStageRequest: MoveDealStageRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Deal>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.moveDealStage(id, moveDealStageRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.moveDealStage']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Reabre uma oportunidade ganha ou perdida. Se ela já estiver aberta, a resposta é `200` com a oportunidade sem alteração.
         * @summary Reabrir oportunidade
         * @param {string} id ID do registro.
         * @param {ReopenDealRequest} [reopenDealRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async reopenDeal(id: string, reopenDealRequest?: ReopenDealRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Deal>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.reopenDeal(id, reopenDealRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.reopenDeal']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `deals.update`
         * @summary Atualizar oportunidade
         * @param {string} id ID do registro.
         * @param {DealInput} dealInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateDeal(id: string, dealInput: DealInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Deal>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateDeal(id, dealInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.updateDeal']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Diz se a oportunidade tem ações ou campos obrigatórios pendentes. Cada lista traz o que falta; vazia quando não falta nada.
         * @summary Validar pendências antes de fechar
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async validateDeal(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ValidateDeal200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.validateDeal(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DealsApi.validateDeal']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * DealsApi - factory interface
 */
export const DealsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = DealsApiFp(configuration)
    return {
        /**
         * Envie `won: true` para ganha, ou `lost: true` com `lostReason` para perdida.
         * @summary Fechar como ganha ou perdida
         * @param {DealsApiCloseDealRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        closeDeal(requestParameters: DealsApiCloseDealRequest, options?: RawAxiosRequestConfig): AxiosPromise<Deal> {
            return localVarFp.closeDeal(requestParameters.id, requestParameters.closeDealRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Se `staff` não for enviado, a API usa o usuário da credencial.  A criação é idempotente por 5 minutos: reenviar o mesmo corpo não duplica o registro. Para controlar a chave, envie o cabeçalho `Idempotency-Key`.  **Permissão do Service Account:** `deals.create`
         * @summary Criar oportunidade
         * @param {DealsApiCreateDealRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createDeal(requestParameters: DealsApiCreateDealRequest, options?: RawAxiosRequestConfig): AxiosPromise<Deal> {
            return localVarFp.createDeal(requestParameters.dealCreate, requestParameters.idempotencyKey, options).then((request) => request(axios, basePath));
        },
        /**
         * Exclusão lógica (`active: false`). Responde `400` com `code: DEAL_HAS_LINKED_JOURNEYS` se houver jornadas ativas vinculadas.  **Permissão do Service Account:** `deals.delete`
         * @summary Excluir oportunidade
         * @param {DealsApiDeleteDealRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteDeal(requestParameters: DealsApiDeleteDealRequest, options?: RawAxiosRequestConfig): AxiosPromise<Deal> {
            return localVarFp.deleteDeal(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * No detalhe, `pipeline` vem como objeto (`_id`, `title`) e `contact` vem com o cadastro completo.  **Permissão do Service Account:** `deals.read`
         * @summary Obter oportunidade
         * @param {DealsApiGetDealRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDeal(requestParameters: DealsApiGetDealRequest, options?: RawAxiosRequestConfig): AxiosPromise<Deal> {
            return localVarFp.getDeal(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Uma entrada por passagem em etapa, com a duração de cada uma e os totais.
         * @summary Histórico de etapas
         * @param {DealsApiGetDealStageHistoryRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDealStageHistory(requestParameters: DealsApiGetDealStageHistoryRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetDealStageHistory200Response> {
            return localVarFp.getDealStageHistory(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `createdAt` decrescente.  **Permissão do Service Account:** `deals.list`
         * @summary Listar oportunidades
         * @param {DealsApiListDealsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listDeals(requestParameters: DealsApiListDealsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListDeals200Response> {
            return localVarFp.listDeals(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.pipeline, requestParameters.stage, requestParameters.contact, requestParameters.organization, requestParameters.staffs, requestParameters.contacts, requestParameters.minDate, requestParameters.maxDate, requestParameters.search, options).then((request) => request(axios, basePath));
        },
        /**
         * Devolve a oportunidade já na nova etapa.
         * @summary Mover de etapa
         * @param {DealsApiMoveDealStageRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        moveDealStage(requestParameters: DealsApiMoveDealStageRequest, options?: RawAxiosRequestConfig): AxiosPromise<Deal> {
            return localVarFp.moveDealStage(requestParameters.id, requestParameters.moveDealStageRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Reabre uma oportunidade ganha ou perdida. Se ela já estiver aberta, a resposta é `200` com a oportunidade sem alteração.
         * @summary Reabrir oportunidade
         * @param {DealsApiReopenDealRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        reopenDeal(requestParameters: DealsApiReopenDealRequest, options?: RawAxiosRequestConfig): AxiosPromise<Deal> {
            return localVarFp.reopenDeal(requestParameters.id, requestParameters.reopenDealRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `deals.update`
         * @summary Atualizar oportunidade
         * @param {DealsApiUpdateDealRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateDeal(requestParameters: DealsApiUpdateDealRequest, options?: RawAxiosRequestConfig): AxiosPromise<Deal> {
            return localVarFp.updateDeal(requestParameters.id, requestParameters.dealInput, options).then((request) => request(axios, basePath));
        },
        /**
         * Diz se a oportunidade tem ações ou campos obrigatórios pendentes. Cada lista traz o que falta; vazia quando não falta nada.
         * @summary Validar pendências antes de fechar
         * @param {DealsApiValidateDealRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        validateDeal(requestParameters: DealsApiValidateDealRequest, options?: RawAxiosRequestConfig): AxiosPromise<ValidateDeal200Response> {
            return localVarFp.validateDeal(requestParameters.id, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for closeDeal operation in DealsApi.
 */
export interface DealsApiCloseDealRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly closeDealRequest: CloseDealRequest
}

/**
 * Request parameters for createDeal operation in DealsApi.
 */
export interface DealsApiCreateDealRequest {
    readonly dealCreate: DealCreate

    /**
     * Chave única da operação (UUID). Repita a mesma chave nas novas tentativas.
     */
    readonly idempotencyKey?: string
}

/**
 * Request parameters for deleteDeal operation in DealsApi.
 */
export interface DealsApiDeleteDealRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getDeal operation in DealsApi.
 */
export interface DealsApiGetDealRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getDealStageHistory operation in DealsApi.
 */
export interface DealsApiGetDealStageHistoryRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listDeals operation in DealsApi.
 */
export interface DealsApiListDealsRequest {
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
    readonly sortType?: ListDealsSortTypeEnum

    /**
     * ID do pipeline.
     */
    readonly pipeline?: string

    /**
     * ID da etapa.
     */
    readonly stage?: string

    /**
     * ID do contato.
     */
    readonly contact?: string

    /**
     * ID da empresa.
     */
    readonly organization?: string

    /**
     * Usuários: busca em responsável, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
     */
    readonly staffs?: Array<string>

    /**
     * Vários contatos. Lista de IDs (&#x60;?contacts[]&#x3D;id1&amp;contacts[]&#x3D;id2&#x60;).
     */
    readonly contacts?: Array<string>

    /**
     * Fechamento previsto (&#x60;expectedCloseDate&#x60;) a partir de. Timestamp em milissegundos, não data ISO.
     */
    readonly minDate?: number

    /**
     * Fechamento previsto até. Timestamp em milissegundos.
     */
    readonly maxDate?: number

    /**
     * Busca em título, nome e e-mail do contato.
     */
    readonly search?: string
}

/**
 * Request parameters for moveDealStage operation in DealsApi.
 */
export interface DealsApiMoveDealStageRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly moveDealStageRequest: MoveDealStageRequest
}

/**
 * Request parameters for reopenDeal operation in DealsApi.
 */
export interface DealsApiReopenDealRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly reopenDealRequest?: ReopenDealRequest
}

/**
 * Request parameters for updateDeal operation in DealsApi.
 */
export interface DealsApiUpdateDealRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly dealInput: DealInput
}

/**
 * Request parameters for validateDeal operation in DealsApi.
 */
export interface DealsApiValidateDealRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * DealsApi - object-oriented interface
 */
export class DealsApi extends BaseAPI {
    /**
     * Envie `won: true` para ganha, ou `lost: true` com `lostReason` para perdida.
     * @summary Fechar como ganha ou perdida
     * @param {DealsApiCloseDealRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public closeDeal(requestParameters: DealsApiCloseDealRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).closeDeal(requestParameters.id, requestParameters.closeDealRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Se `staff` não for enviado, a API usa o usuário da credencial.  A criação é idempotente por 5 minutos: reenviar o mesmo corpo não duplica o registro. Para controlar a chave, envie o cabeçalho `Idempotency-Key`.  **Permissão do Service Account:** `deals.create`
     * @summary Criar oportunidade
     * @param {DealsApiCreateDealRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createDeal(requestParameters: DealsApiCreateDealRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).createDeal(requestParameters.dealCreate, requestParameters.idempotencyKey, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Exclusão lógica (`active: false`). Responde `400` com `code: DEAL_HAS_LINKED_JOURNEYS` se houver jornadas ativas vinculadas.  **Permissão do Service Account:** `deals.delete`
     * @summary Excluir oportunidade
     * @param {DealsApiDeleteDealRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteDeal(requestParameters: DealsApiDeleteDealRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).deleteDeal(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * No detalhe, `pipeline` vem como objeto (`_id`, `title`) e `contact` vem com o cadastro completo.  **Permissão do Service Account:** `deals.read`
     * @summary Obter oportunidade
     * @param {DealsApiGetDealRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getDeal(requestParameters: DealsApiGetDealRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).getDeal(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Uma entrada por passagem em etapa, com a duração de cada uma e os totais.
     * @summary Histórico de etapas
     * @param {DealsApiGetDealStageHistoryRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getDealStageHistory(requestParameters: DealsApiGetDealStageHistoryRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).getDealStageHistory(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `createdAt` decrescente.  **Permissão do Service Account:** `deals.list`
     * @summary Listar oportunidades
     * @param {DealsApiListDealsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listDeals(requestParameters: DealsApiListDealsRequest = {}, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).listDeals(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.pipeline, requestParameters.stage, requestParameters.contact, requestParameters.organization, requestParameters.staffs, requestParameters.contacts, requestParameters.minDate, requestParameters.maxDate, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Devolve a oportunidade já na nova etapa.
     * @summary Mover de etapa
     * @param {DealsApiMoveDealStageRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public moveDealStage(requestParameters: DealsApiMoveDealStageRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).moveDealStage(requestParameters.id, requestParameters.moveDealStageRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Reabre uma oportunidade ganha ou perdida. Se ela já estiver aberta, a resposta é `200` com a oportunidade sem alteração.
     * @summary Reabrir oportunidade
     * @param {DealsApiReopenDealRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public reopenDeal(requestParameters: DealsApiReopenDealRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).reopenDeal(requestParameters.id, requestParameters.reopenDealRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só os campos que mudam.  **Permissão do Service Account:** `deals.update`
     * @summary Atualizar oportunidade
     * @param {DealsApiUpdateDealRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateDeal(requestParameters: DealsApiUpdateDealRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).updateDeal(requestParameters.id, requestParameters.dealInput, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Diz se a oportunidade tem ações ou campos obrigatórios pendentes. Cada lista traz o que falta; vazia quando não falta nada.
     * @summary Validar pendências antes de fechar
     * @param {DealsApiValidateDealRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public validateDeal(requestParameters: DealsApiValidateDealRequest, options?: RawAxiosRequestConfig) {
        return DealsApiFp(this.configuration).validateDeal(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListDealsSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListDealsSortTypeEnum = typeof ListDealsSortTypeEnum[keyof typeof ListDealsSortTypeEnum];

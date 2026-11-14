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
import type { CreateTicketMessageRequest } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListTicketStatuses200Response } from '../models';
// @ts-ignore
import type { ListTickets200Response } from '../models';
// @ts-ignore
import type { Ticket } from '../models';
// @ts-ignore
import type { TicketCreate } from '../models';
// @ts-ignore
import type { TicketInput } from '../models';
// @ts-ignore
import type { TicketMessage } from '../models';
/**
 * TicketsApi - axios parameter creator
 */
export const TicketsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * O único campo obrigatório é `subject`. O ticket é aberto em nome do usuário da credencial. Referências aceitam só o ID em texto.  **Permissão do Service Account:** `tickets.create`
         * @summary Criar ticket
         * @param {TicketCreate} ticketCreate 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTicket: async (ticketCreate: TicketCreate, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'ticketCreate' is not null or undefined
            assertParamExists('createTicket', 'ticketCreate', ticketCreate)
            const localVarPath = `/api/tickets`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(ticketCreate, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Registra uma resposta ou uma nota interna. Um ticket finalizado não aceita mensagens.
         * @summary Enviar mensagem no ticket
         * @param {string} id ID do registro.
         * @param {CreateTicketMessageRequest} createTicketMessageRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTicketMessage: async (id: string, createTicketMessageRequest: CreateTicketMessageRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('createTicketMessage', 'id', id)
            // verify required parameter 'createTicketMessageRequest' is not null or undefined
            assertParamExists('createTicketMessage', 'createTicketMessageRequest', createTicketMessageRequest)
            const localVarPath = `/api/tickets/{id}/messages`
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
            localVarRequestOptions.data = serializeDataIfNeeded(createTicketMessageRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `tickets.delete`
         * @summary Excluir ticket
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteTicket: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteTicket', 'id', id)
            const localVarPath = `/api/tickets/{id}`
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
         * Move o ticket para a situação de conclusão e registra `finishedAt`. Sem corpo.
         * @summary Finalizar ticket
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        finishTicket: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('finishTicket', 'id', id)
            const localVarPath = `/api/tickets/{id}/finish`
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
         * **Permissão do Service Account:** `tickets.read`
         * @summary Obter ticket
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTicket: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getTicket', 'id', id)
            const localVarPath = `/api/tickets/{id}`
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
         * @summary Listar mensagens do ticket
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTicketMessages: async (id: string, page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('listTicketMessages', 'id', id)
            const localVarPath = `/api/tickets/{id}/messages`
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
         * Use para descobrir o `status` de um ticket. As situações são configuradas por área de trabalho.  **Permissão do Service Account:** `tickets.read`
         * @summary Listar situações de ticket
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTicketStatuses: async (page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/tickets/status`;
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
         * A credencial vê os tickets das áreas de trabalho e funções a que o usuário dela pertence.  **Permissão do Service Account:** `tickets.list`
         * @summary Listar tickets
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListTicketsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [status] ID da situação.
         * @param {Array<string>} [statuses] Várias situações. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?statuses[]&#x3D;id1&amp;statuses[]&#x3D;id2&#x60;).
         * @param {string} [category] Categoria da situação, como &#x60;waiting&#x60; ou &#x60;done&#x60;.
         * @param {ListTicketsPriorityEnum} [priority] Prioridade.
         * @param {string} [receiver] ID do responsável.
         * @param {Array<string>} [receivers] Vários responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?receivers[]&#x3D;id1&amp;receivers[]&#x3D;id2&#x60;).
         * @param {string} [sender] ID de quem abriu.
         * @param {Array<string>} [senders] Vários solicitantes. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?senders[]&#x3D;id1&amp;senders[]&#x3D;id2&#x60;).
         * @param {string} [participant] ID de um participante.
         * @param {string} [observer] ID de um observador.
         * @param {string} [contact] ID do contato.
         * @param {Array<string>} [contacts] Vários contatos. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?contacts[]&#x3D;id1&amp;contacts[]&#x3D;id2&#x60;).
         * @param {string} [organization] ID da empresa.
         * @param {string} [deal] ID da oportunidade.
         * @param {string} [workspace] ID da área de trabalho.
         * @param {number} [createdAtMinDate] Abertos a partir de. Timestamp em milissegundos.
         * @param {number} [createdAtMaxDate] Abertos até. Timestamp em milissegundos.
         * @param {string} [search] Busca textual.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTickets: async (page?: number, limit?: number, sortBy?: string, sortType?: ListTicketsSortTypeEnum, status?: string, statuses?: Array<string>, category?: string, priority?: ListTicketsPriorityEnum, receiver?: string, receivers?: Array<string>, sender?: string, senders?: Array<string>, participant?: string, observer?: string, contact?: string, contacts?: Array<string>, organization?: string, deal?: string, workspace?: string, createdAtMinDate?: number, createdAtMaxDate?: number, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/tickets`;
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

            if (status !== undefined) {
                localVarQueryParameter['status'] = status;
            }

            if (statuses) {
                localVarQueryParameter['statuses[]'] = statuses;
            }

            if (category !== undefined) {
                localVarQueryParameter['category'] = category;
            }

            if (priority !== undefined) {
                localVarQueryParameter['priority'] = priority;
            }

            if (receiver !== undefined) {
                localVarQueryParameter['receiver'] = receiver;
            }

            if (receivers) {
                localVarQueryParameter['receivers[]'] = receivers;
            }

            if (sender !== undefined) {
                localVarQueryParameter['sender'] = sender;
            }

            if (senders) {
                localVarQueryParameter['senders[]'] = senders;
            }

            if (participant !== undefined) {
                localVarQueryParameter['participant'] = participant;
            }

            if (observer !== undefined) {
                localVarQueryParameter['observer'] = observer;
            }

            if (contact !== undefined) {
                localVarQueryParameter['contact'] = contact;
            }

            if (contacts) {
                localVarQueryParameter['contacts[]'] = contacts;
            }

            if (organization !== undefined) {
                localVarQueryParameter['organization'] = organization;
            }

            if (deal !== undefined) {
                localVarQueryParameter['deal'] = deal;
            }

            if (workspace !== undefined) {
                localVarQueryParameter['workspace'] = workspace;
            }

            if (createdAtMinDate !== undefined) {
                localVarQueryParameter['createdAt_minDate'] = createdAtMinDate;
            }

            if (createdAtMaxDate !== undefined) {
                localVarQueryParameter['createdAt_maxDate'] = createdAtMaxDate;
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
         * O usuário da credencial assume o ticket como responsável. Sem corpo.
         * @summary Iniciar atendimento do ticket
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        startTicket: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('startTicket', 'id', id)
            const localVarPath = `/api/tickets/{id}/start`
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
         * Envie só os campos que mudam. Para trocar a situação, envie `status` com o ID da nova situação.  **Permissão do Service Account:** `tickets.update`
         * @summary Atualizar ticket
         * @param {string} id ID do registro.
         * @param {TicketInput} ticketInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateTicket: async (id: string, ticketInput: TicketInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateTicket', 'id', id)
            // verify required parameter 'ticketInput' is not null or undefined
            assertParamExists('updateTicket', 'ticketInput', ticketInput)
            const localVarPath = `/api/tickets/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(ticketInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * TicketsApi - functional programming interface
 */
export const TicketsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = TicketsApiAxiosParamCreator(configuration)
    return {
        /**
         * O único campo obrigatório é `subject`. O ticket é aberto em nome do usuário da credencial. Referências aceitam só o ID em texto.  **Permissão do Service Account:** `tickets.create`
         * @summary Criar ticket
         * @param {TicketCreate} ticketCreate 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createTicket(ticketCreate: TicketCreate, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Ticket>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createTicket(ticketCreate, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.createTicket']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Registra uma resposta ou uma nota interna. Um ticket finalizado não aceita mensagens.
         * @summary Enviar mensagem no ticket
         * @param {string} id ID do registro.
         * @param {CreateTicketMessageRequest} createTicketMessageRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createTicketMessage(id: string, createTicketMessageRequest: CreateTicketMessageRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TicketMessage>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createTicketMessage(id, createTicketMessageRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.createTicketMessage']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `tickets.delete`
         * @summary Excluir ticket
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteTicket(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteTicket(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.deleteTicket']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Move o ticket para a situação de conclusão e registra `finishedAt`. Sem corpo.
         * @summary Finalizar ticket
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async finishTicket(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Ticket>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.finishTicket(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.finishTicket']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `tickets.read`
         * @summary Obter ticket
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getTicket(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Ticket>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getTicket(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.getTicket']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Listar mensagens do ticket
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listTicketMessages(id: string, page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<object>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listTicketMessages(id, page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.listTicketMessages']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Use para descobrir o `status` de um ticket. As situações são configuradas por área de trabalho.  **Permissão do Service Account:** `tickets.read`
         * @summary Listar situações de ticket
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listTicketStatuses(page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListTicketStatuses200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listTicketStatuses(page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.listTicketStatuses']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * A credencial vê os tickets das áreas de trabalho e funções a que o usuário dela pertence.  **Permissão do Service Account:** `tickets.list`
         * @summary Listar tickets
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListTicketsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [status] ID da situação.
         * @param {Array<string>} [statuses] Várias situações. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?statuses[]&#x3D;id1&amp;statuses[]&#x3D;id2&#x60;).
         * @param {string} [category] Categoria da situação, como &#x60;waiting&#x60; ou &#x60;done&#x60;.
         * @param {ListTicketsPriorityEnum} [priority] Prioridade.
         * @param {string} [receiver] ID do responsável.
         * @param {Array<string>} [receivers] Vários responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?receivers[]&#x3D;id1&amp;receivers[]&#x3D;id2&#x60;).
         * @param {string} [sender] ID de quem abriu.
         * @param {Array<string>} [senders] Vários solicitantes. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?senders[]&#x3D;id1&amp;senders[]&#x3D;id2&#x60;).
         * @param {string} [participant] ID de um participante.
         * @param {string} [observer] ID de um observador.
         * @param {string} [contact] ID do contato.
         * @param {Array<string>} [contacts] Vários contatos. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?contacts[]&#x3D;id1&amp;contacts[]&#x3D;id2&#x60;).
         * @param {string} [organization] ID da empresa.
         * @param {string} [deal] ID da oportunidade.
         * @param {string} [workspace] ID da área de trabalho.
         * @param {number} [createdAtMinDate] Abertos a partir de. Timestamp em milissegundos.
         * @param {number} [createdAtMaxDate] Abertos até. Timestamp em milissegundos.
         * @param {string} [search] Busca textual.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listTickets(page?: number, limit?: number, sortBy?: string, sortType?: ListTicketsSortTypeEnum, status?: string, statuses?: Array<string>, category?: string, priority?: ListTicketsPriorityEnum, receiver?: string, receivers?: Array<string>, sender?: string, senders?: Array<string>, participant?: string, observer?: string, contact?: string, contacts?: Array<string>, organization?: string, deal?: string, workspace?: string, createdAtMinDate?: number, createdAtMaxDate?: number, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListTickets200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listTickets(page, limit, sortBy, sortType, status, statuses, category, priority, receiver, receivers, sender, senders, participant, observer, contact, contacts, organization, deal, workspace, createdAtMinDate, createdAtMaxDate, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.listTickets']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * O usuário da credencial assume o ticket como responsável. Sem corpo.
         * @summary Iniciar atendimento do ticket
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async startTicket(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Ticket>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.startTicket(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.startTicket']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só os campos que mudam. Para trocar a situação, envie `status` com o ID da nova situação.  **Permissão do Service Account:** `tickets.update`
         * @summary Atualizar ticket
         * @param {string} id ID do registro.
         * @param {TicketInput} ticketInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateTicket(id: string, ticketInput: TicketInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Ticket>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateTicket(id, ticketInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['TicketsApi.updateTicket']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * TicketsApi - factory interface
 */
export const TicketsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = TicketsApiFp(configuration)
    return {
        /**
         * O único campo obrigatório é `subject`. O ticket é aberto em nome do usuário da credencial. Referências aceitam só o ID em texto.  **Permissão do Service Account:** `tickets.create`
         * @summary Criar ticket
         * @param {TicketsApiCreateTicketRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTicket(requestParameters: TicketsApiCreateTicketRequest, options?: RawAxiosRequestConfig): AxiosPromise<Ticket> {
            return localVarFp.createTicket(requestParameters.ticketCreate, options).then((request) => request(axios, basePath));
        },
        /**
         * Registra uma resposta ou uma nota interna. Um ticket finalizado não aceita mensagens.
         * @summary Enviar mensagem no ticket
         * @param {TicketsApiCreateTicketMessageRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTicketMessage(requestParameters: TicketsApiCreateTicketMessageRequest, options?: RawAxiosRequestConfig): AxiosPromise<TicketMessage> {
            return localVarFp.createTicketMessage(requestParameters.id, requestParameters.createTicketMessageRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `tickets.delete`
         * @summary Excluir ticket
         * @param {TicketsApiDeleteTicketRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteTicket(requestParameters: TicketsApiDeleteTicketRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.deleteTicket(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Move o ticket para a situação de conclusão e registra `finishedAt`. Sem corpo.
         * @summary Finalizar ticket
         * @param {TicketsApiFinishTicketRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        finishTicket(requestParameters: TicketsApiFinishTicketRequest, options?: RawAxiosRequestConfig): AxiosPromise<Ticket> {
            return localVarFp.finishTicket(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `tickets.read`
         * @summary Obter ticket
         * @param {TicketsApiGetTicketRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTicket(requestParameters: TicketsApiGetTicketRequest, options?: RawAxiosRequestConfig): AxiosPromise<Ticket> {
            return localVarFp.getTicket(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Listar mensagens do ticket
         * @param {TicketsApiListTicketMessagesRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTicketMessages(requestParameters: TicketsApiListTicketMessagesRequest, options?: RawAxiosRequestConfig): AxiosPromise<object> {
            return localVarFp.listTicketMessages(requestParameters.id, requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Use para descobrir o `status` de um ticket. As situações são configuradas por área de trabalho.  **Permissão do Service Account:** `tickets.read`
         * @summary Listar situações de ticket
         * @param {TicketsApiListTicketStatusesRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTicketStatuses(requestParameters: TicketsApiListTicketStatusesRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListTicketStatuses200Response> {
            return localVarFp.listTicketStatuses(requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * A credencial vê os tickets das áreas de trabalho e funções a que o usuário dela pertence.  **Permissão do Service Account:** `tickets.list`
         * @summary Listar tickets
         * @param {TicketsApiListTicketsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listTickets(requestParameters: TicketsApiListTicketsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListTickets200Response> {
            return localVarFp.listTickets(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.status, requestParameters.statuses, requestParameters.category, requestParameters.priority, requestParameters.receiver, requestParameters.receivers, requestParameters.sender, requestParameters.senders, requestParameters.participant, requestParameters.observer, requestParameters.contact, requestParameters.contacts, requestParameters.organization, requestParameters.deal, requestParameters.workspace, requestParameters.createdAtMinDate, requestParameters.createdAtMaxDate, requestParameters.search, options).then((request) => request(axios, basePath));
        },
        /**
         * O usuário da credencial assume o ticket como responsável. Sem corpo.
         * @summary Iniciar atendimento do ticket
         * @param {TicketsApiStartTicketRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        startTicket(requestParameters: TicketsApiStartTicketRequest, options?: RawAxiosRequestConfig): AxiosPromise<Ticket> {
            return localVarFp.startTicket(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só os campos que mudam. Para trocar a situação, envie `status` com o ID da nova situação.  **Permissão do Service Account:** `tickets.update`
         * @summary Atualizar ticket
         * @param {TicketsApiUpdateTicketRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateTicket(requestParameters: TicketsApiUpdateTicketRequest, options?: RawAxiosRequestConfig): AxiosPromise<Ticket> {
            return localVarFp.updateTicket(requestParameters.id, requestParameters.ticketInput, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createTicket operation in TicketsApi.
 */
export interface TicketsApiCreateTicketRequest {
    readonly ticketCreate: TicketCreate
}

/**
 * Request parameters for createTicketMessage operation in TicketsApi.
 */
export interface TicketsApiCreateTicketMessageRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly createTicketMessageRequest: CreateTicketMessageRequest
}

/**
 * Request parameters for deleteTicket operation in TicketsApi.
 */
export interface TicketsApiDeleteTicketRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for finishTicket operation in TicketsApi.
 */
export interface TicketsApiFinishTicketRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getTicket operation in TicketsApi.
 */
export interface TicketsApiGetTicketRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listTicketMessages operation in TicketsApi.
 */
export interface TicketsApiListTicketMessagesRequest {
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
 * Request parameters for listTicketStatuses operation in TicketsApi.
 */
export interface TicketsApiListTicketStatusesRequest {
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
 * Request parameters for listTickets operation in TicketsApi.
 */
export interface TicketsApiListTicketsRequest {
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
    readonly sortType?: ListTicketsSortTypeEnum

    /**
     * ID da situação.
     */
    readonly status?: string

    /**
     * Várias situações. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?statuses[]&#x3D;id1&amp;statuses[]&#x3D;id2&#x60;).
     */
    readonly statuses?: Array<string>

    /**
     * Categoria da situação, como &#x60;waiting&#x60; ou &#x60;done&#x60;.
     */
    readonly category?: string

    /**
     * Prioridade.
     */
    readonly priority?: ListTicketsPriorityEnum

    /**
     * ID do responsável.
     */
    readonly receiver?: string

    /**
     * Vários responsáveis. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?receivers[]&#x3D;id1&amp;receivers[]&#x3D;id2&#x60;).
     */
    readonly receivers?: Array<string>

    /**
     * ID de quem abriu.
     */
    readonly sender?: string

    /**
     * Vários solicitantes. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?senders[]&#x3D;id1&amp;senders[]&#x3D;id2&#x60;).
     */
    readonly senders?: Array<string>

    /**
     * ID de um participante.
     */
    readonly participant?: string

    /**
     * ID de um observador.
     */
    readonly observer?: string

    /**
     * ID do contato.
     */
    readonly contact?: string

    /**
     * Vários contatos. Lista de IDs: envie com colchetes, mesmo para um só valor (&#x60;?contacts[]&#x3D;id1&amp;contacts[]&#x3D;id2&#x60;).
     */
    readonly contacts?: Array<string>

    /**
     * ID da empresa.
     */
    readonly organization?: string

    /**
     * ID da oportunidade.
     */
    readonly deal?: string

    /**
     * ID da área de trabalho.
     */
    readonly workspace?: string

    /**
     * Abertos a partir de. Timestamp em milissegundos.
     */
    readonly createdAtMinDate?: number

    /**
     * Abertos até. Timestamp em milissegundos.
     */
    readonly createdAtMaxDate?: number

    /**
     * Busca textual.
     */
    readonly search?: string
}

/**
 * Request parameters for startTicket operation in TicketsApi.
 */
export interface TicketsApiStartTicketRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for updateTicket operation in TicketsApi.
 */
export interface TicketsApiUpdateTicketRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly ticketInput: TicketInput
}

/**
 * TicketsApi - object-oriented interface
 */
export class TicketsApi extends BaseAPI {
    /**
     * O único campo obrigatório é `subject`. O ticket é aberto em nome do usuário da credencial. Referências aceitam só o ID em texto.  **Permissão do Service Account:** `tickets.create`
     * @summary Criar ticket
     * @param {TicketsApiCreateTicketRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createTicket(requestParameters: TicketsApiCreateTicketRequest, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).createTicket(requestParameters.ticketCreate, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Registra uma resposta ou uma nota interna. Um ticket finalizado não aceita mensagens.
     * @summary Enviar mensagem no ticket
     * @param {TicketsApiCreateTicketMessageRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createTicketMessage(requestParameters: TicketsApiCreateTicketMessageRequest, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).createTicketMessage(requestParameters.id, requestParameters.createTicketMessageRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `tickets.delete`
     * @summary Excluir ticket
     * @param {TicketsApiDeleteTicketRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteTicket(requestParameters: TicketsApiDeleteTicketRequest, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).deleteTicket(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Move o ticket para a situação de conclusão e registra `finishedAt`. Sem corpo.
     * @summary Finalizar ticket
     * @param {TicketsApiFinishTicketRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public finishTicket(requestParameters: TicketsApiFinishTicketRequest, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).finishTicket(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `tickets.read`
     * @summary Obter ticket
     * @param {TicketsApiGetTicketRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getTicket(requestParameters: TicketsApiGetTicketRequest, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).getTicket(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Listar mensagens do ticket
     * @param {TicketsApiListTicketMessagesRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listTicketMessages(requestParameters: TicketsApiListTicketMessagesRequest, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).listTicketMessages(requestParameters.id, requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Use para descobrir o `status` de um ticket. As situações são configuradas por área de trabalho.  **Permissão do Service Account:** `tickets.read`
     * @summary Listar situações de ticket
     * @param {TicketsApiListTicketStatusesRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listTicketStatuses(requestParameters: TicketsApiListTicketStatusesRequest = {}, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).listTicketStatuses(requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * A credencial vê os tickets das áreas de trabalho e funções a que o usuário dela pertence.  **Permissão do Service Account:** `tickets.list`
     * @summary Listar tickets
     * @param {TicketsApiListTicketsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listTickets(requestParameters: TicketsApiListTicketsRequest = {}, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).listTickets(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.status, requestParameters.statuses, requestParameters.category, requestParameters.priority, requestParameters.receiver, requestParameters.receivers, requestParameters.sender, requestParameters.senders, requestParameters.participant, requestParameters.observer, requestParameters.contact, requestParameters.contacts, requestParameters.organization, requestParameters.deal, requestParameters.workspace, requestParameters.createdAtMinDate, requestParameters.createdAtMaxDate, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * O usuário da credencial assume o ticket como responsável. Sem corpo.
     * @summary Iniciar atendimento do ticket
     * @param {TicketsApiStartTicketRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public startTicket(requestParameters: TicketsApiStartTicketRequest, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).startTicket(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só os campos que mudam. Para trocar a situação, envie `status` com o ID da nova situação.  **Permissão do Service Account:** `tickets.update`
     * @summary Atualizar ticket
     * @param {TicketsApiUpdateTicketRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateTicket(requestParameters: TicketsApiUpdateTicketRequest, options?: RawAxiosRequestConfig) {
        return TicketsApiFp(this.configuration).updateTicket(requestParameters.id, requestParameters.ticketInput, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListTicketsSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListTicketsSortTypeEnum = typeof ListTicketsSortTypeEnum[keyof typeof ListTicketsSortTypeEnum];
export const ListTicketsPriorityEnum = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent',
} as const;
export type ListTicketsPriorityEnum = typeof ListTicketsPriorityEnum[keyof typeof ListTicketsPriorityEnum];

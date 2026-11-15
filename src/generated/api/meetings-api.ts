/* tslint:disable */
/* eslint-disable */
/**
 * API da Magnet Customer
 * A API REST da Magnet Customer permite ler e gravar os registros do CRM a partir dos seus sistemas.  # Comece aqui  ## 1. Crie um Service Account  No CRM, abra **Configurações › Service Accounts** (apenas administradores), clique em **Novo service account**, escolha a validade e as permissões, e copie o **Client ID** e o **Client Secret**. O secret aparece uma única vez.  ## 2. Solicite um token  ```bash curl -X POST https://magnetcustomer.net/realms/platform/protocol/openid-connect/token \\   -H \"Content-Type: application/x-www-form-urlencoded\" \\   -d \"grant_type=client_credentials\" \\   -d \"client_id=SEU_CLIENT_ID\" \\   -d \"client_secret=SEU_CLIENT_SECRET\" ```  ```json { \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\", \"expires_in\": 900, \"token_type\": \"Bearer\" } ```  O token vale 15 minutos e este fluxo não tem refresh token: quando vencer, ou ao receber `401`, repita o pedido.  ## 3. Chame a API  Cada conta tem o seu endereço. Troque `sua-conta` pelo subdomínio que você usa para abrir o CRM:  ```bash curl \"https://sua-conta.platform-api.magnetcustomer.com/api/deals?page=1&limit=15\" \\   -H \"Authorization: Bearer SEU_TOKEN\" ```  Requisições com corpo levam também `Content-Type: application/json`.  # Convenções  ## Paginação  Envie sempre `page`. Com ele, toda listagem devolve o mesmo envelope:  ```json { \"docs\": [], \"total\": 132, \"pages\": 9, \"page\": 1, \"limit\": 15 } ```  | Parâmetro | Padrão | Descrição | |---|---|---| | `page` | — | Página, a partir de 1. **Obrigatório na prática** | | `limit` | 15 | Registros por página. Máximo 100: acima disso a API usa 100 | | `sortBy` | varia por recurso | Campo de ordenação | | `sortType` | `desc` | `asc` ou `desc` | | `search` | — | Busca textual, quando o recurso aceita |  Sem `page`, algumas listagens (Contatos, Pipelines, Campos personalizados e os cadastros de apoio, como tipos e situações) devolvem uma lista simples (`[...]`), sem o envelope, e ignoram `limit`. Para percorrer tudo, peça `page=1` e avance até `page` ser igual a `pages`. Uma página além do fim devolve `docs` vazio.  O tamanho de página padrão é 15, com duas exceções: 25 em Leads, Prospects e Clientes, e 100 em Usuários. Um `limit` inválido cai no padrão.  ## Identificadores e datas  Todo ID é um texto de 24 caracteres hexadecimais, como `507f1f77bcf86cd799439011`. Ao gravar, envie a referência como **ID em texto** — nunca o objeto.  No corpo e nas respostas, datas são ISO 8601 em UTC, como `2026-05-15T10:00:00Z`. Nos filtros de data da URL (`minDate`, `createdAt_minDate`, `dateOfExpires_minDate`...), envie um **timestamp em milissegundos**, como `1798761600000`.  ## Listas na URL  Filtros que aceitam vários valores levam colchetes no nome:  ``` /api/contacts?page=1&staffs[]=507f191e810c19729de860eb&staffs[]=507f191e810c19729de860ec ```  Um valor único sem colchetes (`staffs=id`) ou separado por vírgula (`staffs=id1,id2`) também é aceito.  ## Campos ausentes  Campo sem valor costuma vir **ausente** da resposta, não como `null`. Trate a falta da chave como vazio.  ## Campos personalizados  Os campos criados pelo administrador da conta vão na lista `customFields`:  ```json { \"customFields\": [ { \"customField\": \"507f1f77bcf86cd799439014\", \"k\": \"segmento\", \"v\": \"Tecnologia\" } ] } ```  O valor vai em **`v`**. Um item com `value` é aceito sem erro, mas o campo fica vazio. Descubra os campos e os IDs com `GET /api/customfields?page=1&feature=deal` (troque `deal` por `meeting`, `task`, `contact`...). Com `&required=true` vêm só os obrigatórios da conta.  ## Erros  ```json {   \"reason\": \"Missing required parameters\",   \"message\": \"Missing required parameters\",   \"code\": \"VALIDATION_ERROR\",   \"errors\": [ { \"field\": \"title\", \"message\": \"must NOT have fewer than 1 characters\", \"keyword\": \"minLength\" } ] } ```  | Status | Quando | |---|---| | `400` | Corpo ou parâmetro inválido: campo obrigatório ausente, tipo errado, valor fora da lista, ID fora do formato | | `401` | Token ausente, inválido ou vencido. Corpo: `{\"reason\": \"Access Denied\"}` | | `403` | O Service Account não tem a permissão da rota (`type: SA_PERMISSION_DENIED`, com `requiredPermission`) | | `404` | Registro não encontrado | | `409` | O registro não está no estado que a operação exige | | `429` | Limite de requisições excedido. Espere o tempo de `Retry-After` |  ## Permissões  Um Service Account só chama as rotas que as permissões dele liberam. Cada operação desta referência informa a permissão exigida, quando há uma: marque-a ao criar o Service Account. Uma chamada sem a permissão devolve `403` com o nome dela em `requiredPermission`.  Rotas de administração da conta (usuários, perfis, criação de webhooks, configurações) exigem um usuário administrador e não estão disponíveis para Service Accounts; por isso não aparecem aqui.  ## Limite de requisições  Os limites são aplicados por conta. Ao receber `429`, espere os segundos indicados em `Retry-After` e tente de novo com intervalo crescente.  ## Área de trabalho  Em contas com áreas de trabalho, a API define a área do registro pela credencial ou pelo registro pai. Não envie `workspace`.  # Regras de filtro  Dashboards, widgets, predefinições de filtro, automações e workflows usam o mesmo formato para dizer quais registros entram: o **conjunto de regras** (`ruleset`).  ```json {   \"condition\": \"AND\",   \"rules\": [     { \"fieldId\": \"deal.amount\", \"operator\": \"greater\", \"value\": 1000 },     {       \"condition\": \"OR\",       \"rules\": [         { \"fieldId\": \"deal.won\", \"operator\": \"false_value\" },         { \"fieldId\": \"deal.stage_name\", \"operator\": \"contains\", \"value\": \"Proposta\" }       ]     }   ] } ```  - **`condition`**: `AND` exige todas as regras; `OR`, pelo menos uma. - **`rules`**: cada item é uma condição (`fieldId`, `operator`, `value`) ou um grupo aninhado (`condition`, `rules`). - **`fieldId`**: o `slug` de um campo. A lista de campos da conta, com os personalizados, vem de `GET /api/resource-keywords`; filtre por recurso com `?modelRef=deal`. - **`operator`**: escolha pelo tipo do campo (`type`, na lista de campos).  | Tipo do campo | Operadores | |---|---| | Texto (`string`) | `equals`, `not_equal`, `contains`, `not_contains`, `starts_with`, `ends_with`, `exists`, `not_exists` | | Número e valor (`number`, `monetary`, `days`) | `equals`, `not_equal`, `greater`, `greater_or_equals`, `less`, `less_or_equals`, `between` (com `valueMin` e `valueMax`) | | Sim ou não (`boolean`) | `true_value`, `false_value` | | Lista (`select`) | `in`, `not_in`, com `value` em lista | | Data (`date`) | `current_day`, `current_week`, `current_month`, `current_year`, `before_day`, `before_week`, `before_month`, `before_year`, `last_n_days`, `next_n_days`, `before_date`, `after_date`, `date_between` |  As regras de um widget não são validadas na gravação: um campo ou operador que não existe é aceito, e o resultado vem vazio. Confira os nomes antes de enviar.  # Workflows  Um workflow é um desenho de **passos** (`nodes`) ligados por **saídas** (`edges`). O contato entra por um gatilho e segue as ligações até um passo `end`. Todo caminho precisa terminar num `end`.  ```json {   \"nodes\": [     { \"id\": \"n1\", \"type\": \"manual_trigger\", \"config\": {} },     { \"id\": \"n2\", \"type\": \"wait\", \"config\": { \"amount\": 2, \"unit\": \"days\" } },     { \"id\": \"n3\", \"type\": \"end\", \"config\": {} }   ],   \"edges\": [     { \"id\": \"e1\", \"from\": \"n1\", \"port\": \"default\", \"to\": \"n2\" },     { \"id\": \"e2\", \"from\": \"n2\", \"port\": \"default\", \"to\": \"n3\" }   ] } ```  O ciclo é: criar (`POST /api/workflows`), desenhar (`PATCH`, com `draftGraph`), conferir (`POST .../validate` com `forPublish: true`) e publicar (`POST .../publish`). Só depois de publicado o workflow age sobre contatos.  ## Gatilhos  | `type` | Quando o contato entra | `config` | |---|---|---| | `manual_trigger` | Quando alguém, ou a API, inscreve o contato (`POST /api/workflows/{id}/enrollments`) | vazio | | `segment_trigger` | Na agenda, para os contatos que casam com o filtro | `schedule` (obrigatório): `mode` (`daily`, `weekly`, `monthly`), `hour` (0–23), `minute`, `weekday` (0–6, em `weekly`), `day` (1–28, em `monthly`). `ruleset`: quem entra. `exclude`: quem não entra, no mesmo formato | | `form_trigger` | Quando o contato responde um formulário | `formId` (obrigatório) | | `crm_event_trigger` | Quando um evento do CRM acontece | `event` (obrigatório): `contact.created`, `deal.created`, `deal.stage_changed`, `deal.won`, `deal.lost`, `meeting.created`, `journey.created`, `journey.phase_entered`, `journey.closed`. `filter`: `pipelineId`, `stageId` (eventos de oportunidade); `journeyFlowId`, `phaseId`, `closeStatus`, `churnReasonId` (eventos de jornada). `ruleset`: filtro sobre o contato |  ## Passos  | `type` | O que faz | Saídas (`port`) | `config` | |---|---|---|---| | `wait` | Espera um tempo | `default` | `amount` (1–999) e `unit` (`minutes`, `hours`, `days`, `weeks`), obrigatórios. `businessDaysOnly` | | `if_else` | Separa em dois caminhos | `yes`, `no` | `ruleset` (obrigatório) | | `split` | Separa em vários caminhos; o contato segue o primeiro que casar | o `id` de cada caminho, e `none` | `branches` (2 a 12): `id`, `label` e `ruleset` de cada caminho | | `send_email` | Envia um e-mail | `default` | `designTemplateId` e `subject`, obrigatórios. `preheader`, `links` (`linkId`, `name`), `utm` (`enabled`, `campaign`), `respectContactLimit` | | `wait_reaction` | Espera uma reação a um e-mail anterior | o `id` de cada reação, e `timeout` | `reactionTo` (o `id` do passo de e-mail), `branches` (1 a 8: `id`, `label`, `kind` — `opened`, `clicked_any`, `clicked_link` com `linkId`, ou `crm_event` com `event`) e `timeout` (`amount`, `unit` em `hours`, `days` ou `weeks`), todos obrigatórios | | `create_task` | Cria uma tarefa | `default` | `taskTypeSlug`, `title`, `due` (`mode`: `days_after` com `days`, ou `end_of_cycle_month`) e `assignee` (`mode`: `contact_owner`, `staff` com `staffId`, ou `journey_staff`), obrigatórios. `observation`, `estimatedMinutes` | | `create_deal` | Cria uma oportunidade | `default` | `pipelineId`, `stageId`, `title` e `assignee` (`mode`: `contact_owner`, ou `staff` com `staffId`), obrigatórios. `value`, `expectedClose` (`days`) | | `update_contact` | Altera campos do contato | `default` | `fields` (obrigatório): lista de `fieldId` e `value` | | `end` | Termina o caminho | nenhuma | vazio |  As condições (`ruleset`) seguem o formato de \"Regras de filtro\".  # Webhooks  Para ser avisado quando algo muda no CRM, em vez de consultar a API de tempos em tempos, use webhooks. Um administrador cria o webhook no CRM, em **Integrações › Webhooks**, informando a URL do seu sistema e os eventos. A lista de eventos está em `GET /api/webhooks/triggers`; o formato da entrega, a assinatura e os reenvios estão na seção Webhooks do portal.  # Cobertura  Esta referência cobre Contatos (leads, prospects e clientes), Empresas, Oportunidades, Pipelines, etapas e motivos de perda, Produtos, tabelas de preço e itens de produto, Jornadas, Reuniões, Tarefas, Observações, Tickets, Atendimentos, Usuários, Equipes, Áreas de trabalho, Campos personalizados, Dashboards (com widgets, filtros e resultados), Automações de processo, Workflows, Formulários (com respostas) e os eventos de webhook. 
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
import type { DeleteMeetings200Response } from '../models';
// @ts-ignore
import type { DeleteMeetingsRequest } from '../models';
// @ts-ignore
import type { FinishMeetingRequest } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListMeetingRooms200Response } from '../models';
// @ts-ignore
import type { ListMeetingTypes200Response } from '../models';
// @ts-ignore
import type { ListMeetings200Response } from '../models';
// @ts-ignore
import type { Meeting } from '../models';
// @ts-ignore
import type { MeetingCreate } from '../models';
// @ts-ignore
import type { MeetingInput } from '../models';
/**
 * MeetingsApi - axios parameter creator
 */
export const MeetingsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Obrigatórios por padrão: `title` e `start`. `staff` e `calendar` são preenchidos pela API quando omitidos.  Os campos obrigatórios podem variar por conta: o administrador define quais campos de sistema são obrigatórios. `GET /api/customfields?feature=meeting&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`.  Referências (`staff`, `contact`, `deal`...) aceitam só o ID em texto. Enviar o objeto (`{\"_id\": \"...\"}`) devolve `400 VALIDATION_ERROR`.  **Permissão do Service Account:** `meetings.create`
         * @summary Criar reunião
         * @param {MeetingCreate} meetingCreate 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createMeeting: async (meetingCreate: MeetingCreate, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'meetingCreate' is not null or undefined
            assertParamExists('createMeeting', 'meetingCreate', meetingCreate)
            const localVarPath = `/api/meetings`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(meetingCreate, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `meetings.delete`
         * @summary Excluir reunião
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteMeeting: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteMeeting', 'id', id)
            const localVarPath = `/api/meetings/{id}`
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
         * @summary Excluir várias reuniões
         * @param {DeleteMeetingsRequest} deleteMeetingsRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteMeetings: async (deleteMeetingsRequest: DeleteMeetingsRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'deleteMeetingsRequest' is not null or undefined
            assertParamExists('deleteMeetings', 'deleteMeetingsRequest', deleteMeetingsRequest)
            const localVarPath = `/api/meetings/selected/remove`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(deleteMeetingsRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Marca como `finished` e registra `dateFinished`.
         * @summary Concluir reunião
         * @param {string} id ID do registro.
         * @param {FinishMeetingRequest} [finishMeetingRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        finishMeeting: async (id: string, finishMeetingRequest?: FinishMeetingRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('finishMeeting', 'id', id)
            const localVarPath = `/api/meetings/{id}/finish`
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
            localVarRequestOptions.data = serializeDataIfNeeded(finishMeetingRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `meetings.read`
         * @summary Obter reunião
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getMeeting: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getMeeting', 'id', id)
            const localVarPath = `/api/meetings/{id}`
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
         * Use para descobrir o `room` de uma reunião.
         * @summary Listar salas de reunião
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listMeetingRooms: async (page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/meetingrooms`;
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
         * Use para descobrir o `type` de uma reunião.
         * @summary Listar tipos de reunião
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listMeetingTypes: async (page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/meetingtypes`;
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
         * Ordenação padrão: `start` decrescente.  **Permissão do Service Account:** `meetings.list`
         * @summary Listar reuniões
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListMeetingsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [staff] ID do organizador.
         * @param {Array<string>} [staffs] Usuários: busca em organizador, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [type] ID do tipo de reunião.
         * @param {string} [room] ID da sala.
         * @param {string} [contact] ID do contato.
         * @param {string} [deal] ID da oportunidade.
         * @param {string} [organization] ID da empresa.
         * @param {ListMeetingsPriorityEnum} [priority] Prioridade.
         * @param {ListMeetingsStatusEnum} [status] Situação.
         * @param {Array<string>} [labels] Etiquetas. Lista de IDs (&#x60;?labels[]&#x3D;id1&amp;labels[]&#x3D;id2&#x60;).
         * @param {string} [startMinDate] Início a partir de (timestamp em ms ou data ISO).
         * @param {string} [startMaxDate] Início até (timestamp em ms ou data ISO).
         * @param {number} [createdAtMinDate] Criada a partir de (timestamp em milissegundos).
         * @param {number} [createdAtMaxDate] Criada até (timestamp em milissegundos).
         * @param {ListMeetingsVisualizationEnum} [visualization] Atalho de período.
         * @param {string} [search] Busca em título, descrição, contato, empresa, oportunidade e organizador.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listMeetings: async (page?: number, limit?: number, sortBy?: string, sortType?: ListMeetingsSortTypeEnum, staff?: string, staffs?: Array<string>, type?: string, room?: string, contact?: string, deal?: string, organization?: string, priority?: ListMeetingsPriorityEnum, status?: ListMeetingsStatusEnum, labels?: Array<string>, startMinDate?: string, startMaxDate?: string, createdAtMinDate?: number, createdAtMaxDate?: number, visualization?: ListMeetingsVisualizationEnum, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/meetings`;
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

            if (staff !== undefined) {
                localVarQueryParameter['staff'] = staff;
            }

            if (staffs) {
                localVarQueryParameter['staffs[]'] = staffs;
            }

            if (type !== undefined) {
                localVarQueryParameter['type'] = type;
            }

            if (room !== undefined) {
                localVarQueryParameter['room'] = room;
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

            if (priority !== undefined) {
                localVarQueryParameter['priority'] = priority;
            }

            if (status !== undefined) {
                localVarQueryParameter['status'] = status;
            }

            if (labels) {
                localVarQueryParameter['labels[]'] = labels;
            }

            if (startMinDate !== undefined) {
                localVarQueryParameter['start_minDate'] = startMinDate;
            }

            if (startMaxDate !== undefined) {
                localVarQueryParameter['start_maxDate'] = startMaxDate;
            }

            if (createdAtMinDate !== undefined) {
                localVarQueryParameter['createdAt_minDate'] = createdAtMinDate;
            }

            if (createdAtMaxDate !== undefined) {
                localVarQueryParameter['createdAt_maxDate'] = createdAtMaxDate;
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
         * Substitui o registro: reenvie o objeto completo. Para alterar só alguns campos, use `PATCH`.  **Permissão do Service Account:** `meetings.update`
         * @summary Substituir reunião
         * @param {string} id ID do registro.
         * @param {MeetingCreate} meetingCreate 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        replaceMeeting: async (id: string, meetingCreate: MeetingCreate, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('replaceMeeting', 'id', id)
            // verify required parameter 'meetingCreate' is not null or undefined
            assertParamExists('replaceMeeting', 'meetingCreate', meetingCreate)
            const localVarPath = `/api/meetings/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(meetingCreate, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Atualização parcial: envie só os campos que mudam.
         * @summary Atualizar reunião
         * @param {string} id ID do registro.
         * @param {MeetingInput} meetingInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateMeeting: async (id: string, meetingInput: MeetingInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateMeeting', 'id', id)
            // verify required parameter 'meetingInput' is not null or undefined
            assertParamExists('updateMeeting', 'meetingInput', meetingInput)
            const localVarPath = `/api/meetings/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(meetingInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * MeetingsApi - functional programming interface
 */
export const MeetingsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = MeetingsApiAxiosParamCreator(configuration)
    return {
        /**
         * Obrigatórios por padrão: `title` e `start`. `staff` e `calendar` são preenchidos pela API quando omitidos.  Os campos obrigatórios podem variar por conta: o administrador define quais campos de sistema são obrigatórios. `GET /api/customfields?feature=meeting&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`.  Referências (`staff`, `contact`, `deal`...) aceitam só o ID em texto. Enviar o objeto (`{\"_id\": \"...\"}`) devolve `400 VALIDATION_ERROR`.  **Permissão do Service Account:** `meetings.create`
         * @summary Criar reunião
         * @param {MeetingCreate} meetingCreate 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createMeeting(meetingCreate: MeetingCreate, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Meeting>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createMeeting(meetingCreate, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.createMeeting']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `meetings.delete`
         * @summary Excluir reunião
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteMeeting(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteMeeting(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.deleteMeeting']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Excluir várias reuniões
         * @param {DeleteMeetingsRequest} deleteMeetingsRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteMeetings(deleteMeetingsRequest: DeleteMeetingsRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeleteMeetings200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteMeetings(deleteMeetingsRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.deleteMeetings']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Marca como `finished` e registra `dateFinished`.
         * @summary Concluir reunião
         * @param {string} id ID do registro.
         * @param {FinishMeetingRequest} [finishMeetingRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async finishMeeting(id: string, finishMeetingRequest?: FinishMeetingRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Meeting>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.finishMeeting(id, finishMeetingRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.finishMeeting']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `meetings.read`
         * @summary Obter reunião
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getMeeting(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Meeting>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getMeeting(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.getMeeting']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Use para descobrir o `room` de uma reunião.
         * @summary Listar salas de reunião
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listMeetingRooms(page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListMeetingRooms200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listMeetingRooms(page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.listMeetingRooms']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Use para descobrir o `type` de uma reunião.
         * @summary Listar tipos de reunião
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listMeetingTypes(page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListMeetingTypes200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listMeetingTypes(page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.listMeetingTypes']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `start` decrescente.  **Permissão do Service Account:** `meetings.list`
         * @summary Listar reuniões
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListMeetingsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [staff] ID do organizador.
         * @param {Array<string>} [staffs] Usuários: busca em organizador, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [type] ID do tipo de reunião.
         * @param {string} [room] ID da sala.
         * @param {string} [contact] ID do contato.
         * @param {string} [deal] ID da oportunidade.
         * @param {string} [organization] ID da empresa.
         * @param {ListMeetingsPriorityEnum} [priority] Prioridade.
         * @param {ListMeetingsStatusEnum} [status] Situação.
         * @param {Array<string>} [labels] Etiquetas. Lista de IDs (&#x60;?labels[]&#x3D;id1&amp;labels[]&#x3D;id2&#x60;).
         * @param {string} [startMinDate] Início a partir de (timestamp em ms ou data ISO).
         * @param {string} [startMaxDate] Início até (timestamp em ms ou data ISO).
         * @param {number} [createdAtMinDate] Criada a partir de (timestamp em milissegundos).
         * @param {number} [createdAtMaxDate] Criada até (timestamp em milissegundos).
         * @param {ListMeetingsVisualizationEnum} [visualization] Atalho de período.
         * @param {string} [search] Busca em título, descrição, contato, empresa, oportunidade e organizador.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listMeetings(page?: number, limit?: number, sortBy?: string, sortType?: ListMeetingsSortTypeEnum, staff?: string, staffs?: Array<string>, type?: string, room?: string, contact?: string, deal?: string, organization?: string, priority?: ListMeetingsPriorityEnum, status?: ListMeetingsStatusEnum, labels?: Array<string>, startMinDate?: string, startMaxDate?: string, createdAtMinDate?: number, createdAtMaxDate?: number, visualization?: ListMeetingsVisualizationEnum, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListMeetings200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listMeetings(page, limit, sortBy, sortType, staff, staffs, type, room, contact, deal, organization, priority, status, labels, startMinDate, startMaxDate, createdAtMinDate, createdAtMaxDate, visualization, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.listMeetings']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Substitui o registro: reenvie o objeto completo. Para alterar só alguns campos, use `PATCH`.  **Permissão do Service Account:** `meetings.update`
         * @summary Substituir reunião
         * @param {string} id ID do registro.
         * @param {MeetingCreate} meetingCreate 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async replaceMeeting(id: string, meetingCreate: MeetingCreate, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Meeting>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.replaceMeeting(id, meetingCreate, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.replaceMeeting']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Atualização parcial: envie só os campos que mudam.
         * @summary Atualizar reunião
         * @param {string} id ID do registro.
         * @param {MeetingInput} meetingInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateMeeting(id: string, meetingInput: MeetingInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Meeting>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateMeeting(id, meetingInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['MeetingsApi.updateMeeting']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * MeetingsApi - factory interface
 */
export const MeetingsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = MeetingsApiFp(configuration)
    return {
        /**
         * Obrigatórios por padrão: `title` e `start`. `staff` e `calendar` são preenchidos pela API quando omitidos.  Os campos obrigatórios podem variar por conta: o administrador define quais campos de sistema são obrigatórios. `GET /api/customfields?feature=meeting&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`.  Referências (`staff`, `contact`, `deal`...) aceitam só o ID em texto. Enviar o objeto (`{\"_id\": \"...\"}`) devolve `400 VALIDATION_ERROR`.  **Permissão do Service Account:** `meetings.create`
         * @summary Criar reunião
         * @param {MeetingsApiCreateMeetingRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createMeeting(requestParameters: MeetingsApiCreateMeetingRequest, options?: RawAxiosRequestConfig): AxiosPromise<Meeting> {
            return localVarFp.createMeeting(requestParameters.meetingCreate, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `meetings.delete`
         * @summary Excluir reunião
         * @param {MeetingsApiDeleteMeetingRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteMeeting(requestParameters: MeetingsApiDeleteMeetingRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.deleteMeeting(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Excluir várias reuniões
         * @param {MeetingsApiDeleteMeetingsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteMeetings(requestParameters: MeetingsApiDeleteMeetingsRequest, options?: RawAxiosRequestConfig): AxiosPromise<DeleteMeetings200Response> {
            return localVarFp.deleteMeetings(requestParameters.deleteMeetingsRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Marca como `finished` e registra `dateFinished`.
         * @summary Concluir reunião
         * @param {MeetingsApiFinishMeetingRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        finishMeeting(requestParameters: MeetingsApiFinishMeetingRequest, options?: RawAxiosRequestConfig): AxiosPromise<Meeting> {
            return localVarFp.finishMeeting(requestParameters.id, requestParameters.finishMeetingRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `meetings.read`
         * @summary Obter reunião
         * @param {MeetingsApiGetMeetingRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getMeeting(requestParameters: MeetingsApiGetMeetingRequest, options?: RawAxiosRequestConfig): AxiosPromise<Meeting> {
            return localVarFp.getMeeting(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Use para descobrir o `room` de uma reunião.
         * @summary Listar salas de reunião
         * @param {MeetingsApiListMeetingRoomsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listMeetingRooms(requestParameters: MeetingsApiListMeetingRoomsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListMeetingRooms200Response> {
            return localVarFp.listMeetingRooms(requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Use para descobrir o `type` de uma reunião.
         * @summary Listar tipos de reunião
         * @param {MeetingsApiListMeetingTypesRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listMeetingTypes(requestParameters: MeetingsApiListMeetingTypesRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListMeetingTypes200Response> {
            return localVarFp.listMeetingTypes(requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `start` decrescente.  **Permissão do Service Account:** `meetings.list`
         * @summary Listar reuniões
         * @param {MeetingsApiListMeetingsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listMeetings(requestParameters: MeetingsApiListMeetingsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListMeetings200Response> {
            return localVarFp.listMeetings(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.staff, requestParameters.staffs, requestParameters.type, requestParameters.room, requestParameters.contact, requestParameters.deal, requestParameters.organization, requestParameters.priority, requestParameters.status, requestParameters.labels, requestParameters.startMinDate, requestParameters.startMaxDate, requestParameters.createdAtMinDate, requestParameters.createdAtMaxDate, requestParameters.visualization, requestParameters.search, options).then((request) => request(axios, basePath));
        },
        /**
         * Substitui o registro: reenvie o objeto completo. Para alterar só alguns campos, use `PATCH`.  **Permissão do Service Account:** `meetings.update`
         * @summary Substituir reunião
         * @param {MeetingsApiReplaceMeetingRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        replaceMeeting(requestParameters: MeetingsApiReplaceMeetingRequest, options?: RawAxiosRequestConfig): AxiosPromise<Meeting> {
            return localVarFp.replaceMeeting(requestParameters.id, requestParameters.meetingCreate, options).then((request) => request(axios, basePath));
        },
        /**
         * Atualização parcial: envie só os campos que mudam.
         * @summary Atualizar reunião
         * @param {MeetingsApiUpdateMeetingRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateMeeting(requestParameters: MeetingsApiUpdateMeetingRequest, options?: RawAxiosRequestConfig): AxiosPromise<Meeting> {
            return localVarFp.updateMeeting(requestParameters.id, requestParameters.meetingInput, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createMeeting operation in MeetingsApi.
 */
export interface MeetingsApiCreateMeetingRequest {
    readonly meetingCreate: MeetingCreate
}

/**
 * Request parameters for deleteMeeting operation in MeetingsApi.
 */
export interface MeetingsApiDeleteMeetingRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for deleteMeetings operation in MeetingsApi.
 */
export interface MeetingsApiDeleteMeetingsRequest {
    readonly deleteMeetingsRequest: DeleteMeetingsRequest
}

/**
 * Request parameters for finishMeeting operation in MeetingsApi.
 */
export interface MeetingsApiFinishMeetingRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly finishMeetingRequest?: FinishMeetingRequest
}

/**
 * Request parameters for getMeeting operation in MeetingsApi.
 */
export interface MeetingsApiGetMeetingRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listMeetingRooms operation in MeetingsApi.
 */
export interface MeetingsApiListMeetingRoomsRequest {
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
 * Request parameters for listMeetingTypes operation in MeetingsApi.
 */
export interface MeetingsApiListMeetingTypesRequest {
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
 * Request parameters for listMeetings operation in MeetingsApi.
 */
export interface MeetingsApiListMeetingsRequest {
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
    readonly sortType?: ListMeetingsSortTypeEnum

    /**
     * ID do organizador.
     */
    readonly staff?: string

    /**
     * Usuários: busca em organizador, participantes e observadores. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
     */
    readonly staffs?: Array<string>

    /**
     * ID do tipo de reunião.
     */
    readonly type?: string

    /**
     * ID da sala.
     */
    readonly room?: string

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
     * Prioridade.
     */
    readonly priority?: ListMeetingsPriorityEnum

    /**
     * Situação.
     */
    readonly status?: ListMeetingsStatusEnum

    /**
     * Etiquetas. Lista de IDs (&#x60;?labels[]&#x3D;id1&amp;labels[]&#x3D;id2&#x60;).
     */
    readonly labels?: Array<string>

    /**
     * Início a partir de (timestamp em ms ou data ISO).
     */
    readonly startMinDate?: string

    /**
     * Início até (timestamp em ms ou data ISO).
     */
    readonly startMaxDate?: string

    /**
     * Criada a partir de (timestamp em milissegundos).
     */
    readonly createdAtMinDate?: number

    /**
     * Criada até (timestamp em milissegundos).
     */
    readonly createdAtMaxDate?: number

    /**
     * Atalho de período.
     */
    readonly visualization?: ListMeetingsVisualizationEnum

    /**
     * Busca em título, descrição, contato, empresa, oportunidade e organizador.
     */
    readonly search?: string
}

/**
 * Request parameters for replaceMeeting operation in MeetingsApi.
 */
export interface MeetingsApiReplaceMeetingRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly meetingCreate: MeetingCreate
}

/**
 * Request parameters for updateMeeting operation in MeetingsApi.
 */
export interface MeetingsApiUpdateMeetingRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly meetingInput: MeetingInput
}

/**
 * MeetingsApi - object-oriented interface
 */
export class MeetingsApi extends BaseAPI {
    /**
     * Obrigatórios por padrão: `title` e `start`. `staff` e `calendar` são preenchidos pela API quando omitidos.  Os campos obrigatórios podem variar por conta: o administrador define quais campos de sistema são obrigatórios. `GET /api/customfields?feature=meeting&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`.  Referências (`staff`, `contact`, `deal`...) aceitam só o ID em texto. Enviar o objeto (`{\"_id\": \"...\"}`) devolve `400 VALIDATION_ERROR`.  **Permissão do Service Account:** `meetings.create`
     * @summary Criar reunião
     * @param {MeetingsApiCreateMeetingRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createMeeting(requestParameters: MeetingsApiCreateMeetingRequest, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).createMeeting(requestParameters.meetingCreate, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `meetings.delete`
     * @summary Excluir reunião
     * @param {MeetingsApiDeleteMeetingRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteMeeting(requestParameters: MeetingsApiDeleteMeetingRequest, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).deleteMeeting(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Excluir várias reuniões
     * @param {MeetingsApiDeleteMeetingsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteMeetings(requestParameters: MeetingsApiDeleteMeetingsRequest, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).deleteMeetings(requestParameters.deleteMeetingsRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Marca como `finished` e registra `dateFinished`.
     * @summary Concluir reunião
     * @param {MeetingsApiFinishMeetingRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public finishMeeting(requestParameters: MeetingsApiFinishMeetingRequest, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).finishMeeting(requestParameters.id, requestParameters.finishMeetingRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `meetings.read`
     * @summary Obter reunião
     * @param {MeetingsApiGetMeetingRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getMeeting(requestParameters: MeetingsApiGetMeetingRequest, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).getMeeting(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Use para descobrir o `room` de uma reunião.
     * @summary Listar salas de reunião
     * @param {MeetingsApiListMeetingRoomsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listMeetingRooms(requestParameters: MeetingsApiListMeetingRoomsRequest = {}, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).listMeetingRooms(requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Use para descobrir o `type` de uma reunião.
     * @summary Listar tipos de reunião
     * @param {MeetingsApiListMeetingTypesRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listMeetingTypes(requestParameters: MeetingsApiListMeetingTypesRequest = {}, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).listMeetingTypes(requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `start` decrescente.  **Permissão do Service Account:** `meetings.list`
     * @summary Listar reuniões
     * @param {MeetingsApiListMeetingsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listMeetings(requestParameters: MeetingsApiListMeetingsRequest = {}, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).listMeetings(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.staff, requestParameters.staffs, requestParameters.type, requestParameters.room, requestParameters.contact, requestParameters.deal, requestParameters.organization, requestParameters.priority, requestParameters.status, requestParameters.labels, requestParameters.startMinDate, requestParameters.startMaxDate, requestParameters.createdAtMinDate, requestParameters.createdAtMaxDate, requestParameters.visualization, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Substitui o registro: reenvie o objeto completo. Para alterar só alguns campos, use `PATCH`.  **Permissão do Service Account:** `meetings.update`
     * @summary Substituir reunião
     * @param {MeetingsApiReplaceMeetingRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public replaceMeeting(requestParameters: MeetingsApiReplaceMeetingRequest, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).replaceMeeting(requestParameters.id, requestParameters.meetingCreate, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Atualização parcial: envie só os campos que mudam.
     * @summary Atualizar reunião
     * @param {MeetingsApiUpdateMeetingRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateMeeting(requestParameters: MeetingsApiUpdateMeetingRequest, options?: RawAxiosRequestConfig) {
        return MeetingsApiFp(this.configuration).updateMeeting(requestParameters.id, requestParameters.meetingInput, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListMeetingsSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListMeetingsSortTypeEnum = typeof ListMeetingsSortTypeEnum[keyof typeof ListMeetingsSortTypeEnum];
export const ListMeetingsPriorityEnum = {
    p1: 'p1',
    p2: 'p2',
    p3: 'p3',
    p4: 'p4',
} as const;
export type ListMeetingsPriorityEnum = typeof ListMeetingsPriorityEnum[keyof typeof ListMeetingsPriorityEnum];
export const ListMeetingsStatusEnum = {
    pending: 'pending',
    cancelled: 'cancelled',
    finished: 'finished',
    no_show: 'no-show',
} as const;
export type ListMeetingsStatusEnum = typeof ListMeetingsStatusEnum[keyof typeof ListMeetingsStatusEnum];
export const ListMeetingsVisualizationEnum = {
    all: 'all',
    dueDateToday: 'dueDateToday',
    dueDateWeek: 'dueDateWeek',
    nextWeek: 'nextWeek',
    finished: 'finished',
} as const;
export type ListMeetingsVisualizationEnum = typeof ListMeetingsVisualizationEnum[keyof typeof ListMeetingsVisualizationEnum];

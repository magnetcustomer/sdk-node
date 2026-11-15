/* tslint:disable */
/* eslint-disable */
/**
 * API da Magnet Customer
 * A API REST da Magnet Customer permite ler e gravar os registros do CRM a partir dos seus sistemas.  # Comece aqui  ## 1. Crie um Service Account  No CRM, abra **Configurações › Service Accounts** (apenas administradores), clique em **Novo service account**, escolha a validade e as permissões, e copie o **Client ID** e o **Client Secret**. O secret aparece uma única vez.  ## 2. Solicite um token  ```bash curl -X POST https://magnetcustomer.net/realms/platform/protocol/openid-connect/token \\   -H \"Content-Type: application/x-www-form-urlencoded\" \\   -d \"grant_type=client_credentials\" \\   -d \"client_id=SEU_CLIENT_ID\" \\   -d \"client_secret=SEU_CLIENT_SECRET\" ```  ```json { \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\", \"expires_in\": 900, \"token_type\": \"Bearer\" } ```  O token vale 15 minutos e este fluxo não tem refresh token: quando vencer, ou ao receber `401`, repita o pedido.  ## 3. Chame a API  Cada conta tem o seu endereço. Troque `sua-conta` pelo subdomínio que você usa para abrir o CRM:  ```bash curl \"https://sua-conta.platform-api.magnetcustomer.com/api/deals?page=1&limit=15\" \\   -H \"Authorization: Bearer SEU_TOKEN\" ```  Requisições com corpo levam também `Content-Type: application/json`.  # Convenções  ## Paginação  Envie sempre `page`. Com ele, toda listagem devolve o mesmo envelope:  ```json { \"docs\": [], \"total\": 132, \"pages\": 9, \"page\": 1, \"limit\": 15 } ```  | Parâmetro | Padrão | Descrição | |---|---|---| | `page` | — | Página, a partir de 1. **Obrigatório na prática** | | `limit` | 15 | Registros por página. Máximo 100: acima disso a API usa 100 | | `sortBy` | varia por recurso | Campo de ordenação | | `sortType` | `desc` | `asc` ou `desc` | | `search` | — | Busca textual, quando o recurso aceita |  Sem `page`, algumas listagens (Contatos, Pipelines, Campos personalizados e os cadastros de apoio, como tipos e situações) devolvem uma lista simples (`[...]`), sem o envelope, e ignoram `limit`. Para percorrer tudo, peça `page=1` e avance até `page` ser igual a `pages`. Uma página além do fim devolve `docs` vazio.  O tamanho de página padrão é 15, com duas exceções: 25 em Leads, Prospects e Clientes, e 100 em Usuários. Um `limit` inválido cai no padrão.  ## Identificadores e datas  Todo ID é um texto de 24 caracteres hexadecimais, como `507f1f77bcf86cd799439011`. Ao gravar, envie a referência como **ID em texto** — nunca o objeto.  No corpo e nas respostas, datas são ISO 8601 em UTC, como `2026-05-15T10:00:00Z`. Nos filtros de data da URL (`minDate`, `createdAt_minDate`, `dateOfExpires_minDate`...), envie um **timestamp em milissegundos**, como `1798761600000`.  ## Listas na URL  Filtros que aceitam vários valores levam colchetes no nome:  ``` /api/contacts?page=1&staffs[]=507f191e810c19729de860eb&staffs[]=507f191e810c19729de860ec ```  Um valor único sem colchetes (`staffs=id`) ou separado por vírgula (`staffs=id1,id2`) também é aceito.  ## Campos ausentes  Campo sem valor costuma vir **ausente** da resposta, não como `null`. Trate a falta da chave como vazio.  ## Campos personalizados  Os campos criados pelo administrador da conta vão na lista `customFields`:  ```json { \"customFields\": [ { \"customField\": \"507f1f77bcf86cd799439014\", \"k\": \"segmento\", \"v\": \"Tecnologia\" } ] } ```  O valor vai em **`v`**. Um item com `value` é aceito sem erro, mas o campo fica vazio. Descubra os campos e os IDs com `GET /api/customfields?page=1&feature=deal` (troque `deal` por `meeting`, `task`, `contact`...). Com `&required=true` vêm só os obrigatórios da conta.  ## Erros  ```json {   \"reason\": \"Missing required parameters\",   \"message\": \"Missing required parameters\",   \"code\": \"VALIDATION_ERROR\",   \"errors\": [ { \"field\": \"title\", \"message\": \"must NOT have fewer than 1 characters\", \"keyword\": \"minLength\" } ] } ```  | Status | Quando | |---|---| | `400` | Corpo ou parâmetro inválido: campo obrigatório ausente, tipo errado, valor fora da lista, ID fora do formato | | `401` | Token ausente, inválido ou vencido. Corpo: `{\"reason\": \"Access Denied\"}` | | `403` | O Service Account não tem a permissão da rota (`type: SA_PERMISSION_DENIED`, com `requiredPermission`) | | `404` | Registro não encontrado | | `409` | O registro não está no estado que a operação exige | | `429` | Limite de requisições excedido. Espere o tempo de `Retry-After` |  ## Permissões  Um Service Account só chama as rotas que as permissões dele liberam. Cada operação desta referência informa a permissão exigida, quando há uma: marque-a ao criar o Service Account. Uma chamada sem a permissão devolve `403` com o nome dela em `requiredPermission`.  Rotas de administração da conta (usuários, perfis, criação de webhooks, configurações) exigem um usuário administrador e não estão disponíveis para Service Accounts; por isso não aparecem aqui.  ## Limite de requisições  Os limites são aplicados por conta. Ao receber `429`, espere os segundos indicados em `Retry-After` e tente de novo com intervalo crescente.  ## Área de trabalho  Em contas com áreas de trabalho, a API define a área do registro pela credencial ou pelo registro pai. Não envie `workspace`.  # Regras de filtro  Dashboards, widgets, predefinições de filtro, automações, workflows e campanhas usam o mesmo formato para dizer quais registros entram: o **conjunto de regras** (`ruleset`).  ```json {   \"condition\": \"AND\",   \"rules\": [     { \"fieldId\": \"deal.amount\", \"operator\": \"greater\", \"value\": 1000 },     {       \"condition\": \"OR\",       \"rules\": [         { \"fieldId\": \"deal.won\", \"operator\": \"false_value\" },         { \"fieldId\": \"deal.stage_name\", \"operator\": \"contains\", \"value\": \"Proposta\" }       ]     }   ] } ```  - **`condition`**: `AND` exige todas as regras; `OR`, pelo menos uma. - **`rules`**: cada item é uma condição (`fieldId`, `operator`, `value`) ou um grupo aninhado (`condition`, `rules`). - **`fieldId`**: o `slug` de um campo. A lista de campos da conta, com os personalizados, vem de `GET /api/resource-keywords`; filtre por recurso com `?modelRef=deal`. - **`operator`**: escolha pelo tipo do campo (`type`, na lista de campos).  | Tipo do campo | Operadores | |---|---| | Texto (`string`) | `equals`, `not_equal`, `contains`, `not_contains`, `starts_with`, `ends_with`, `exists`, `not_exists` | | Número e valor (`number`, `monetary`, `days`) | `equals`, `not_equal`, `greater`, `greater_or_equals`, `less`, `less_or_equals`, `between` (com `valueMin` e `valueMax`) | | Sim ou não (`boolean`) | `true_value`, `false_value` | | Lista (`select`) | `in`, `not_in`, com `value` em lista | | Data (`date`) | `current_day`, `current_week`, `current_month`, `current_year`, `before_day`, `before_week`, `before_month`, `before_year`, `last_n_days`, `next_n_days`, `before_date`, `after_date`, `date_between` |  As regras de um widget não são validadas na gravação: um campo ou operador que não existe é aceito, e o resultado vem vazio. Confira os nomes antes de enviar.  # Workflows  Um workflow é um desenho de **passos** (`nodes`) ligados por **saídas** (`edges`). O contato entra por um gatilho e segue as ligações até um passo `end`. Todo caminho precisa terminar num `end`.  ```json {   \"nodes\": [     { \"id\": \"n1\", \"type\": \"manual_trigger\", \"config\": {} },     { \"id\": \"n2\", \"type\": \"wait\", \"config\": { \"amount\": 2, \"unit\": \"days\" } },     { \"id\": \"n3\", \"type\": \"end\", \"config\": {} }   ],   \"edges\": [     { \"id\": \"e1\", \"from\": \"n1\", \"port\": \"default\", \"to\": \"n2\" },     { \"id\": \"e2\", \"from\": \"n2\", \"port\": \"default\", \"to\": \"n3\" }   ] } ```  O ciclo é: criar (`POST /api/workflows`), desenhar (`PATCH`, com `draftGraph`), conferir (`POST .../validate` com `forPublish: true`) e publicar (`POST .../publish`). Só depois de publicado o workflow age sobre contatos.  ## Gatilhos  | `type` | Quando o contato entra | `config` | |---|---|---| | `manual_trigger` | Quando alguém, ou a API, inscreve o contato (`POST /api/workflows/{id}/enrollments`) | vazio | | `segment_trigger` | Na agenda, para os contatos que casam com o filtro | `schedule` (obrigatório): `mode` (`daily`, `weekly`, `monthly`), `hour` (0–23), `minute`, `weekday` (0–6, em `weekly`), `day` (1–28, em `monthly`). `ruleset`: quem entra. `exclude`: quem não entra, no mesmo formato | | `form_trigger` | Quando o contato responde um formulário | `formId` (obrigatório) | | `crm_event_trigger` | Quando um evento do CRM acontece | `event` (obrigatório): `contact.created`, `deal.created`, `deal.stage_changed`, `deal.won`, `deal.lost`, `meeting.created`, `journey.created`, `journey.phase_entered`, `journey.closed`. `filter`: `pipelineId`, `stageId` (eventos de oportunidade); `journeyFlowId`, `phaseId`, `closeStatus`, `churnReasonId` (eventos de jornada). `ruleset`: filtro sobre o contato |  ## Passos  | `type` | O que faz | Saídas (`port`) | `config` | |---|---|---|---| | `wait` | Espera um tempo | `default` | `amount` (1–999) e `unit` (`minutes`, `hours`, `days`, `weeks`), obrigatórios. `businessDaysOnly` | | `if_else` | Separa em dois caminhos | `yes`, `no` | `ruleset` (obrigatório) | | `split` | Separa em vários caminhos; o contato segue o primeiro que casar | o `id` de cada caminho, e `none` | `branches` (2 a 12): `id`, `label` e `ruleset` de cada caminho | | `send_email` | Envia um e-mail | `default` | `designTemplateId` e `subject`, obrigatórios. `preheader`, `links` (`linkId`, `name`), `utm` (`enabled`, `campaign`), `respectContactLimit` | | `wait_reaction` | Espera uma reação a um e-mail anterior | o `id` de cada reação, e `timeout` | `reactionTo` (o `id` do passo de e-mail), `branches` (1 a 8: `id`, `label`, `kind` — `opened`, `clicked_any`, `clicked_link` com `linkId`, ou `crm_event` com `event`) e `timeout` (`amount`, `unit` em `hours`, `days` ou `weeks`), todos obrigatórios | | `create_task` | Cria uma tarefa | `default` | `taskTypeSlug`, `title`, `due` (`mode`: `days_after` com `days`, ou `end_of_cycle_month`) e `assignee` (`mode`: `contact_owner`, `staff` com `staffId`, ou `journey_staff`), obrigatórios. `observation`, `estimatedMinutes` | | `create_deal` | Cria uma oportunidade | `default` | `pipelineId`, `stageId`, `title` e `assignee` (`mode`: `contact_owner`, ou `staff` com `staffId`), obrigatórios. `value`, `expectedClose` (`days`) | | `update_contact` | Altera campos do contato | `default` | `fields` (obrigatório): lista de `fieldId` e `value` | | `end` | Termina o caminho | nenhuma | vazio |  As condições (`ruleset`) seguem o formato de \"Regras de filtro\".  # Webhooks  Para ser avisado quando algo muda no CRM, em vez de consultar a API de tempos em tempos, use webhooks. Um administrador cria o webhook no CRM, em **Integrações › Webhooks**, informando a URL do seu sistema e os eventos. A lista de eventos está em `GET /api/webhooks/triggers`; o formato da entrega, a assinatura e os reenvios estão na seção Webhooks do portal.  # Cobertura  Esta referência cobre Contatos (leads, prospects e clientes), Empresas, Oportunidades, Pipelines, etapas e motivos de perda, Produtos, tabelas de preço e itens de produto, Jornadas, Reuniões, Tarefas, Observações, Tickets, Atendimentos, Usuários, Equipes, Áreas de trabalho, Campos personalizados, Dashboards (com widgets, filtros e resultados), Automações de processo, Workflows, Campanhas, Produtos financeiros, Formulários (com respostas), a assistente de IA e os eventos de webhook. 
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
import type { AiChat } from '../models';
// @ts-ignore
import type { ConfirmAiMessageRequest } from '../models';
// @ts-ignore
import type { CreateAiChatRequest } from '../models';
// @ts-ignore
import type { GetAiBalance200Response } from '../models';
// @ts-ignore
import type { GetAiChat200Response } from '../models';
// @ts-ignore
import type { ListAiChats200Response } from '../models';
// @ts-ignore
import type { ListAiSkills200Response } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { RateAiChat200Response } from '../models';
// @ts-ignore
import type { RateAiChatRequest } from '../models';
// @ts-ignore
import type { SendAiMessageRequest } from '../models';
/**
 * AiAssistantApi - axios parameter creator
 */
export const AiAssistantApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * A conversa deixa de aparecer na listagem.
         * @summary Arquivar conversa com a Mag
         * @param {string} chatId ID da conversa.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        archiveAiChat: async (chatId: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'chatId' is not null or undefined
            assertParamExists('archiveAiChat', 'chatId', chatId)
            const localVarPath = `/api/ai/chats/{chatId}`
                .replace(`{${"chatId"}}`, encodeURIComponent(String(chatId)));
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
         * Responde a um evento `confirmation`. Com `approved: true`, a Mag executa a ação e continua; com `false`, desiste dela. Quando há mais de uma ação pendente, `approvedIds` escolhe quais executar. A resposta chega em fluxo, com os mesmos eventos do envio de mensagem.
         * @summary Confirmar ou recusar uma ação da Mag
         * @param {string} chatId ID da conversa.
         * @param {string} messageId ID da mensagem que pediu a confirmação (&#x60;messageId&#x60; do evento &#x60;confirmation&#x60;).
         * @param {ConfirmAiMessageRequest} confirmAiMessageRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        confirmAiMessage: async (chatId: string, messageId: string, confirmAiMessageRequest: ConfirmAiMessageRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'chatId' is not null or undefined
            assertParamExists('confirmAiMessage', 'chatId', chatId)
            // verify required parameter 'messageId' is not null or undefined
            assertParamExists('confirmAiMessage', 'messageId', messageId)
            // verify required parameter 'confirmAiMessageRequest' is not null or undefined
            assertParamExists('confirmAiMessage', 'confirmAiMessageRequest', confirmAiMessageRequest)
            const localVarPath = `/api/ai/chats/{chatId}/messages/{messageId}/confirm`
                .replace(`{${"chatId"}}`, encodeURIComponent(String(chatId)))
                .replace(`{${"messageId"}}`, encodeURIComponent(String(messageId)));
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
            localVarHeaderParameter['Accept'] = 'text/event-stream,application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(confirmAiMessageRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Abre uma conversa vazia. Criar não consome créditos; o consumo acontece a cada mensagem.
         * @summary Criar conversa com a Mag
         * @param {CreateAiChatRequest} [createAiChatRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createAiChat: async (createAiChatRequest?: CreateAiChatRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/ai/chats`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createAiChatRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Créditos disponíveis para as respostas da Mag.
         * @summary Obter saldo de créditos de IA
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAiBalance: async (options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/ai/chats/balance`;
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
         * Devolve a conversa e as mensagens, em ordem.
         * @summary Obter conversa com a Mag
         * @param {string} chatId ID da conversa.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAiChat: async (chatId: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'chatId' is not null or undefined
            assertParamExists('getAiChat', 'chatId', chatId)
            const localVarPath = `/api/ai/chats/{chatId}`
                .replace(`{${"chatId"}}`, encodeURIComponent(String(chatId)));
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
         * Conversas do Service Account que fez a chamada, da mais recente para a mais antiga. As arquivadas não aparecem.
         * @summary Listar conversas com a Mag
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAiChats: async (page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/ai/chats`;
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
         * Pedidos prontos para enviar à Mag, como \"Meu dia\" e \"Oportunidades paradas\". O `prompt` de cada um pode ser enviado como `text` de uma mensagem.
         * @summary Listar sugestões de pedido
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAiSkills: async (options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/ai/chats/skills`;
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
         * @summary Avaliar conversa com a Mag
         * @param {string} chatId ID da conversa.
         * @param {RateAiChatRequest} rateAiChatRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        rateAiChat: async (chatId: string, rateAiChatRequest: RateAiChatRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'chatId' is not null or undefined
            assertParamExists('rateAiChat', 'chatId', chatId)
            // verify required parameter 'rateAiChatRequest' is not null or undefined
            assertParamExists('rateAiChat', 'rateAiChatRequest', rateAiChatRequest)
            const localVarPath = `/api/ai/chats/{chatId}/rating`
                .replace(`{${"chatId"}}`, encodeURIComponent(String(chatId)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(rateAiChatRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Envia um pedido em linguagem natural. A Mag consulta e altera o CRM em nome do Service Account que fez a chamada, e cada resposta consome créditos de IA da conta.  A resposta chega em fluxo (`text/event-stream`), um evento por bloco:  | Evento | Quando | Dados | |---|---|---| | `text` | A cada trecho da resposta | `text` | | `tool` | Quando a Mag consulta ou altera algo no CRM | a consulta ou ação em andamento | | `confirmation` | Quando uma ação precisa de confirmação antes de ser executada | `messageId`, `message`, `preview`, `pendingToolCalls` | | `done` | No fim do turno | `messageId`, `userMessageId`, `status` (`completed` ou `awaiting_confirmation`), `costCents`, `balanceCredits` | | `title` | Depois do `done`, quando a conversa ganha um título | o título | | `error` | Em caso de falha | `reason`, `status` (`402`: créditos insuficientes) |  O status HTTP é `200` mesmo quando o turno falha: confira o evento `error`.
         * @summary Enviar mensagem à Mag
         * @param {string} chatId ID da conversa.
         * @param {SendAiMessageRequest} sendAiMessageRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        sendAiMessage: async (chatId: string, sendAiMessageRequest: SendAiMessageRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'chatId' is not null or undefined
            assertParamExists('sendAiMessage', 'chatId', chatId)
            // verify required parameter 'sendAiMessageRequest' is not null or undefined
            assertParamExists('sendAiMessage', 'sendAiMessageRequest', sendAiMessageRequest)
            const localVarPath = `/api/ai/chats/{chatId}/messages`
                .replace(`{${"chatId"}}`, encodeURIComponent(String(chatId)));
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
            localVarHeaderParameter['Accept'] = 'text/event-stream,application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(sendAiMessageRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * AiAssistantApi - functional programming interface
 */
export const AiAssistantApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = AiAssistantApiAxiosParamCreator(configuration)
    return {
        /**
         * A conversa deixa de aparecer na listagem.
         * @summary Arquivar conversa com a Mag
         * @param {string} chatId ID da conversa.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async archiveAiChat(chatId: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.archiveAiChat(chatId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.archiveAiChat']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Responde a um evento `confirmation`. Com `approved: true`, a Mag executa a ação e continua; com `false`, desiste dela. Quando há mais de uma ação pendente, `approvedIds` escolhe quais executar. A resposta chega em fluxo, com os mesmos eventos do envio de mensagem.
         * @summary Confirmar ou recusar uma ação da Mag
         * @param {string} chatId ID da conversa.
         * @param {string} messageId ID da mensagem que pediu a confirmação (&#x60;messageId&#x60; do evento &#x60;confirmation&#x60;).
         * @param {ConfirmAiMessageRequest} confirmAiMessageRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async confirmAiMessage(chatId: string, messageId: string, confirmAiMessageRequest: ConfirmAiMessageRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<string>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.confirmAiMessage(chatId, messageId, confirmAiMessageRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.confirmAiMessage']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Abre uma conversa vazia. Criar não consome créditos; o consumo acontece a cada mensagem.
         * @summary Criar conversa com a Mag
         * @param {CreateAiChatRequest} [createAiChatRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createAiChat(createAiChatRequest?: CreateAiChatRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<AiChat>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createAiChat(createAiChatRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.createAiChat']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Créditos disponíveis para as respostas da Mag.
         * @summary Obter saldo de créditos de IA
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getAiBalance(options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetAiBalance200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getAiBalance(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.getAiBalance']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Devolve a conversa e as mensagens, em ordem.
         * @summary Obter conversa com a Mag
         * @param {string} chatId ID da conversa.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getAiChat(chatId: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetAiChat200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getAiChat(chatId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.getAiChat']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Conversas do Service Account que fez a chamada, da mais recente para a mais antiga. As arquivadas não aparecem.
         * @summary Listar conversas com a Mag
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listAiChats(page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListAiChats200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listAiChats(page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.listAiChats']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Pedidos prontos para enviar à Mag, como \"Meu dia\" e \"Oportunidades paradas\". O `prompt` de cada um pode ser enviado como `text` de uma mensagem.
         * @summary Listar sugestões de pedido
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listAiSkills(options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListAiSkills200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listAiSkills(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.listAiSkills']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Avaliar conversa com a Mag
         * @param {string} chatId ID da conversa.
         * @param {RateAiChatRequest} rateAiChatRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async rateAiChat(chatId: string, rateAiChatRequest: RateAiChatRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<RateAiChat200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.rateAiChat(chatId, rateAiChatRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.rateAiChat']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envia um pedido em linguagem natural. A Mag consulta e altera o CRM em nome do Service Account que fez a chamada, e cada resposta consome créditos de IA da conta.  A resposta chega em fluxo (`text/event-stream`), um evento por bloco:  | Evento | Quando | Dados | |---|---|---| | `text` | A cada trecho da resposta | `text` | | `tool` | Quando a Mag consulta ou altera algo no CRM | a consulta ou ação em andamento | | `confirmation` | Quando uma ação precisa de confirmação antes de ser executada | `messageId`, `message`, `preview`, `pendingToolCalls` | | `done` | No fim do turno | `messageId`, `userMessageId`, `status` (`completed` ou `awaiting_confirmation`), `costCents`, `balanceCredits` | | `title` | Depois do `done`, quando a conversa ganha um título | o título | | `error` | Em caso de falha | `reason`, `status` (`402`: créditos insuficientes) |  O status HTTP é `200` mesmo quando o turno falha: confira o evento `error`.
         * @summary Enviar mensagem à Mag
         * @param {string} chatId ID da conversa.
         * @param {SendAiMessageRequest} sendAiMessageRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async sendAiMessage(chatId: string, sendAiMessageRequest: SendAiMessageRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<string>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.sendAiMessage(chatId, sendAiMessageRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['AiAssistantApi.sendAiMessage']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * AiAssistantApi - factory interface
 */
export const AiAssistantApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = AiAssistantApiFp(configuration)
    return {
        /**
         * A conversa deixa de aparecer na listagem.
         * @summary Arquivar conversa com a Mag
         * @param {AiAssistantApiArchiveAiChatRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        archiveAiChat(requestParameters: AiAssistantApiArchiveAiChatRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.archiveAiChat(requestParameters.chatId, options).then((request) => request(axios, basePath));
        },
        /**
         * Responde a um evento `confirmation`. Com `approved: true`, a Mag executa a ação e continua; com `false`, desiste dela. Quando há mais de uma ação pendente, `approvedIds` escolhe quais executar. A resposta chega em fluxo, com os mesmos eventos do envio de mensagem.
         * @summary Confirmar ou recusar uma ação da Mag
         * @param {AiAssistantApiConfirmAiMessageRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        confirmAiMessage(requestParameters: AiAssistantApiConfirmAiMessageRequest, options?: RawAxiosRequestConfig): AxiosPromise<string> {
            return localVarFp.confirmAiMessage(requestParameters.chatId, requestParameters.messageId, requestParameters.confirmAiMessageRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Abre uma conversa vazia. Criar não consome créditos; o consumo acontece a cada mensagem.
         * @summary Criar conversa com a Mag
         * @param {AiAssistantApiCreateAiChatRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createAiChat(requestParameters: AiAssistantApiCreateAiChatRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<AiChat> {
            return localVarFp.createAiChat(requestParameters.createAiChatRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Créditos disponíveis para as respostas da Mag.
         * @summary Obter saldo de créditos de IA
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAiBalance(options?: RawAxiosRequestConfig): AxiosPromise<GetAiBalance200Response> {
            return localVarFp.getAiBalance(options).then((request) => request(axios, basePath));
        },
        /**
         * Devolve a conversa e as mensagens, em ordem.
         * @summary Obter conversa com a Mag
         * @param {AiAssistantApiGetAiChatRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getAiChat(requestParameters: AiAssistantApiGetAiChatRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetAiChat200Response> {
            return localVarFp.getAiChat(requestParameters.chatId, options).then((request) => request(axios, basePath));
        },
        /**
         * Conversas do Service Account que fez a chamada, da mais recente para a mais antiga. As arquivadas não aparecem.
         * @summary Listar conversas com a Mag
         * @param {AiAssistantApiListAiChatsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAiChats(requestParameters: AiAssistantApiListAiChatsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListAiChats200Response> {
            return localVarFp.listAiChats(requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Pedidos prontos para enviar à Mag, como \"Meu dia\" e \"Oportunidades paradas\". O `prompt` de cada um pode ser enviado como `text` de uma mensagem.
         * @summary Listar sugestões de pedido
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listAiSkills(options?: RawAxiosRequestConfig): AxiosPromise<ListAiSkills200Response> {
            return localVarFp.listAiSkills(options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Avaliar conversa com a Mag
         * @param {AiAssistantApiRateAiChatRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        rateAiChat(requestParameters: AiAssistantApiRateAiChatRequest, options?: RawAxiosRequestConfig): AxiosPromise<RateAiChat200Response> {
            return localVarFp.rateAiChat(requestParameters.chatId, requestParameters.rateAiChatRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Envia um pedido em linguagem natural. A Mag consulta e altera o CRM em nome do Service Account que fez a chamada, e cada resposta consome créditos de IA da conta.  A resposta chega em fluxo (`text/event-stream`), um evento por bloco:  | Evento | Quando | Dados | |---|---|---| | `text` | A cada trecho da resposta | `text` | | `tool` | Quando a Mag consulta ou altera algo no CRM | a consulta ou ação em andamento | | `confirmation` | Quando uma ação precisa de confirmação antes de ser executada | `messageId`, `message`, `preview`, `pendingToolCalls` | | `done` | No fim do turno | `messageId`, `userMessageId`, `status` (`completed` ou `awaiting_confirmation`), `costCents`, `balanceCredits` | | `title` | Depois do `done`, quando a conversa ganha um título | o título | | `error` | Em caso de falha | `reason`, `status` (`402`: créditos insuficientes) |  O status HTTP é `200` mesmo quando o turno falha: confira o evento `error`.
         * @summary Enviar mensagem à Mag
         * @param {AiAssistantApiSendAiMessageRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        sendAiMessage(requestParameters: AiAssistantApiSendAiMessageRequest, options?: RawAxiosRequestConfig): AxiosPromise<string> {
            return localVarFp.sendAiMessage(requestParameters.chatId, requestParameters.sendAiMessageRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for archiveAiChat operation in AiAssistantApi.
 */
export interface AiAssistantApiArchiveAiChatRequest {
    /**
     * ID da conversa.
     */
    readonly chatId: string
}

/**
 * Request parameters for confirmAiMessage operation in AiAssistantApi.
 */
export interface AiAssistantApiConfirmAiMessageRequest {
    /**
     * ID da conversa.
     */
    readonly chatId: string

    /**
     * ID da mensagem que pediu a confirmação (&#x60;messageId&#x60; do evento &#x60;confirmation&#x60;).
     */
    readonly messageId: string

    readonly confirmAiMessageRequest: ConfirmAiMessageRequest
}

/**
 * Request parameters for createAiChat operation in AiAssistantApi.
 */
export interface AiAssistantApiCreateAiChatRequest {
    readonly createAiChatRequest?: CreateAiChatRequest
}

/**
 * Request parameters for getAiChat operation in AiAssistantApi.
 */
export interface AiAssistantApiGetAiChatRequest {
    /**
     * ID da conversa.
     */
    readonly chatId: string
}

/**
 * Request parameters for listAiChats operation in AiAssistantApi.
 */
export interface AiAssistantApiListAiChatsRequest {
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
 * Request parameters for rateAiChat operation in AiAssistantApi.
 */
export interface AiAssistantApiRateAiChatRequest {
    /**
     * ID da conversa.
     */
    readonly chatId: string

    readonly rateAiChatRequest: RateAiChatRequest
}

/**
 * Request parameters for sendAiMessage operation in AiAssistantApi.
 */
export interface AiAssistantApiSendAiMessageRequest {
    /**
     * ID da conversa.
     */
    readonly chatId: string

    readonly sendAiMessageRequest: SendAiMessageRequest
}

/**
 * AiAssistantApi - object-oriented interface
 */
export class AiAssistantApi extends BaseAPI {
    /**
     * A conversa deixa de aparecer na listagem.
     * @summary Arquivar conversa com a Mag
     * @param {AiAssistantApiArchiveAiChatRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public archiveAiChat(requestParameters: AiAssistantApiArchiveAiChatRequest, options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).archiveAiChat(requestParameters.chatId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Responde a um evento `confirmation`. Com `approved: true`, a Mag executa a ação e continua; com `false`, desiste dela. Quando há mais de uma ação pendente, `approvedIds` escolhe quais executar. A resposta chega em fluxo, com os mesmos eventos do envio de mensagem.
     * @summary Confirmar ou recusar uma ação da Mag
     * @param {AiAssistantApiConfirmAiMessageRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public confirmAiMessage(requestParameters: AiAssistantApiConfirmAiMessageRequest, options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).confirmAiMessage(requestParameters.chatId, requestParameters.messageId, requestParameters.confirmAiMessageRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Abre uma conversa vazia. Criar não consome créditos; o consumo acontece a cada mensagem.
     * @summary Criar conversa com a Mag
     * @param {AiAssistantApiCreateAiChatRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createAiChat(requestParameters: AiAssistantApiCreateAiChatRequest = {}, options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).createAiChat(requestParameters.createAiChatRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Créditos disponíveis para as respostas da Mag.
     * @summary Obter saldo de créditos de IA
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getAiBalance(options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).getAiBalance(options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Devolve a conversa e as mensagens, em ordem.
     * @summary Obter conversa com a Mag
     * @param {AiAssistantApiGetAiChatRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getAiChat(requestParameters: AiAssistantApiGetAiChatRequest, options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).getAiChat(requestParameters.chatId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Conversas do Service Account que fez a chamada, da mais recente para a mais antiga. As arquivadas não aparecem.
     * @summary Listar conversas com a Mag
     * @param {AiAssistantApiListAiChatsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listAiChats(requestParameters: AiAssistantApiListAiChatsRequest = {}, options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).listAiChats(requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Pedidos prontos para enviar à Mag, como \"Meu dia\" e \"Oportunidades paradas\". O `prompt` de cada um pode ser enviado como `text` de uma mensagem.
     * @summary Listar sugestões de pedido
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listAiSkills(options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).listAiSkills(options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Avaliar conversa com a Mag
     * @param {AiAssistantApiRateAiChatRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public rateAiChat(requestParameters: AiAssistantApiRateAiChatRequest, options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).rateAiChat(requestParameters.chatId, requestParameters.rateAiChatRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envia um pedido em linguagem natural. A Mag consulta e altera o CRM em nome do Service Account que fez a chamada, e cada resposta consome créditos de IA da conta.  A resposta chega em fluxo (`text/event-stream`), um evento por bloco:  | Evento | Quando | Dados | |---|---|---| | `text` | A cada trecho da resposta | `text` | | `tool` | Quando a Mag consulta ou altera algo no CRM | a consulta ou ação em andamento | | `confirmation` | Quando uma ação precisa de confirmação antes de ser executada | `messageId`, `message`, `preview`, `pendingToolCalls` | | `done` | No fim do turno | `messageId`, `userMessageId`, `status` (`completed` ou `awaiting_confirmation`), `costCents`, `balanceCredits` | | `title` | Depois do `done`, quando a conversa ganha um título | o título | | `error` | Em caso de falha | `reason`, `status` (`402`: créditos insuficientes) |  O status HTTP é `200` mesmo quando o turno falha: confira o evento `error`.
     * @summary Enviar mensagem à Mag
     * @param {AiAssistantApiSendAiMessageRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public sendAiMessage(requestParameters: AiAssistantApiSendAiMessageRequest, options?: RawAxiosRequestConfig) {
        return AiAssistantApiFp(this.configuration).sendAiMessage(requestParameters.chatId, requestParameters.sendAiMessageRequest, options).then((request) => request(this.axios, this.basePath));
    }
}


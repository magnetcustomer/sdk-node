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
import type { Campaign } from '../models';
// @ts-ignore
import type { CampaignAction } from '../models';
// @ts-ignore
import type { CampaignContent } from '../models';
// @ts-ignore
import type { CampaignContentInput } from '../models';
// @ts-ignore
import type { CampaignInput } from '../models';
// @ts-ignore
import type { DeleteCampaignContent200Response } from '../models';
// @ts-ignore
import type { GetCampaignStats200Response } from '../models';
// @ts-ignore
import type { GetCampaignsGlobalStats200Response } from '../models';
// @ts-ignore
import type { ListCampaignChannels200ResponseInner } from '../models';
// @ts-ignore
import type { ListCampaignRecipients200Response } from '../models';
// @ts-ignore
import type { ListCampaigns200Response } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { PreflightCampaign200Response } from '../models';
// @ts-ignore
import type { PreviewCampaignContent200Response } from '../models';
// @ts-ignore
import type { PreviewCampaignContentRequest } from '../models';
// @ts-ignore
import type { PreviewCampaignSegment200Response } from '../models';
// @ts-ignore
import type { PreviewCampaignSegmentRequest } from '../models';
// @ts-ignore
import type { PublishCampaignContent200Response } from '../models';
// @ts-ignore
import type { SimulateCampaign200Response } from '../models';
// @ts-ignore
import type { StartCampaign422Response } from '../models';
// @ts-ignore
import type { UnpublishCampaignContent200Response } from '../models';
// @ts-ignore
import type { UpdateCampaignActionRequest } from '../models';
// @ts-ignore
import type { UpdateCampaignContentRequest } from '../models';
// @ts-ignore
import type { UpdateCampaignRequest } from '../models';
/**
 * CampaignsApi - axios parameter creator
 */
export const CampaignsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Encerra a campanha sem enviar o que faltava. Não tem volta: para enviar de novo, duplique a campanha.  **Permissão do Service Account:** `campaigns.cancel`
         * @summary Cancelar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        cancelCampaign: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('cancelCampaign', 'id', id)
            const localVarPath = `/api/campaigns/{id}/cancel`
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
         * Cria a campanha em rascunho (`draft`), com o canal de e-mail. Nada é enviado até a campanha ser iniciada. Em seguida, crie o conteúdo (`POST /api/campaigns/{campaignId}/templates`), publique-o e confira com a simulação.  **Permissão do Service Account:** `campaigns.create`
         * @summary Criar campanha
         * @param {CampaignInput} campaignInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createCampaign: async (campaignInput: CampaignInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignInput' is not null or undefined
            assertParamExists('createCampaign', 'campaignInput', campaignInput)
            const localVarPath = `/api/campaigns`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(campaignInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Hoje há um tipo: `create_task`, que cria uma tarefa para cada destinatário.  **Permissão do Service Account:** `campaigns.update`
         * @summary Criar ação da campanha
         * @param {string} campaignId ID da campanha.
         * @param {CampaignAction} campaignAction 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createCampaignAction: async (campaignId: string, campaignAction: CampaignAction, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('createCampaignAction', 'campaignId', campaignId)
            // verify required parameter 'campaignAction' is not null or undefined
            assertParamExists('createCampaignAction', 'campaignAction', campaignAction)
            const localVarPath = `/api/campaigns/{campaignId}/actions`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(campaignAction, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Cria o conteúdo de um canal. No e-mail, o assunto vai em `subject`, na raiz, e o corpo em `emailSettings`. O conteúdo nasce não publicado; a resposta traz `emailCheck`, com o que precisa de atenção.  **Permissão do Service Account:** `campaigns.update`
         * @summary Criar conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {CampaignContentInput} campaignContentInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createCampaignContent: async (campaignId: string, campaignContentInput: CampaignContentInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('createCampaignContent', 'campaignId', campaignId)
            // verify required parameter 'campaignContentInput' is not null or undefined
            assertParamExists('createCampaignContent', 'campaignContentInput', campaignContentInput)
            const localVarPath = `/api/campaigns/{campaignId}/templates`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(campaignContentInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Excluir ação da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} actionId ID da ação (&#x60;_id&#x60; devolvido ao criar).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteCampaignAction: async (campaignId: string, actionId: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('deleteCampaignAction', 'campaignId', campaignId)
            // verify required parameter 'actionId' is not null or undefined
            assertParamExists('deleteCampaignAction', 'actionId', actionId)
            const localVarPath = `/api/campaigns/{campaignId}/actions/{actionId}`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
                .replace(`{${"actionId"}}`, encodeURIComponent(String(actionId)));
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
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Excluir conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteCampaignContent: async (campaignId: string, id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('deleteCampaignContent', 'campaignId', campaignId)
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteCampaignContent', 'id', id)
            const localVarPath = `/api/campaigns/{campaignId}/templates/{id}`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
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
         * Cria uma cópia em rascunho, com \"(Cópia)\" no nome.  **Permissão do Service Account:** `campaigns.create`
         * @summary Duplicar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        duplicateCampaign: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('duplicateCampaign', 'id', id)
            const localVarPath = `/api/campaigns/{id}/duplicate`
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
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaign: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getCampaign', 'id', id)
            const localVarPath = `/api/campaigns/{id}`
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
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter ação da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} actionId ID da ação (&#x60;_id&#x60; devolvido ao criar).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaignAction: async (campaignId: string, actionId: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('getCampaignAction', 'campaignId', campaignId)
            // verify required parameter 'actionId' is not null or undefined
            assertParamExists('getCampaignAction', 'actionId', actionId)
            const localVarPath = `/api/campaigns/{campaignId}/actions/{actionId}`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
                .replace(`{${"actionId"}}`, encodeURIComponent(String(actionId)));
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
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaignContent: async (campaignId: string, id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('getCampaignContent', 'campaignId', campaignId)
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getCampaignContent', 'id', id)
            const localVarPath = `/api/campaigns/{campaignId}/templates/{id}`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
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
         * **Permissão do Service Account:** `campaigns.read-stats`
         * @summary Obter resultados da campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaignStats: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getCampaignStats', 'id', id)
            const localVarPath = `/api/campaigns/{id}/stats`
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
         * Totais da conta: campanhas por estado, envios, aberturas e cliques.  **Permissão do Service Account:** `campaigns.read-stats`
         * @summary Obter resultados de todas as campanhas
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaignsGlobalStats: async (options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/campaigns/global-stats`;
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
         * Devolve uma lista simples, sem paginação.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar ações da campanha
         * @param {string} campaignId ID da campanha.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaignActions: async (campaignId: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('listCampaignActions', 'campaignId', campaignId)
            const localVarPath = `/api/campaigns/{campaignId}/actions`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)));
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
         * Canais disponíveis na conta. O `_id` do canal é o `channel` exigido ao criar um conteúdo.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar canais de campanha
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaignChannels: async (options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/campaign-channels/active`;
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
         * Devolve uma lista simples, sem paginação.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar conteúdos da campanha
         * @param {string} campaignId ID da campanha.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaignContents: async (campaignId: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('listCampaignContents', 'campaignId', campaignId)
            const localVarPath = `/api/campaigns/{campaignId}/templates`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)));
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
         * Um registro por destinatário, com o estado do envio. Ordenação padrão: `sentAt` decrescente. Tamanho de página padrão: 25.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar destinatários da campanha
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListCampaignRecipientsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {ListCampaignRecipientsStatusEnum} [status] Filtra pelo estado do envio.
         * @param {string} [search] Busca no e-mail ou no telefone.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaignRecipients: async (id: string, page?: number, limit?: number, sortBy?: string, sortType?: ListCampaignRecipientsSortTypeEnum, status?: ListCampaignRecipientsStatusEnum, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('listCampaignRecipients', 'id', id)
            const localVarPath = `/api/campaigns/{id}/recipients`
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

            if (sortBy !== undefined) {
                localVarQueryParameter['sortBy'] = sortBy;
            }

            if (sortType !== undefined) {
                localVarQueryParameter['sortType'] = sortType;
            }

            if (status !== undefined) {
                localVarQueryParameter['status'] = status;
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
         * Ordenação padrão: `createdAt` decrescente. Tamanho de página padrão: 15.  **Permissão do Service Account:** `campaigns.list`
         * @summary Listar campanhas
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListCampaignsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {ListCampaignsStatusEnum} [status] Filtra pelo estado.
         * @param {ListCampaignsTargetEntityEnum} [targetEntity] Filtra pelo tipo de registro do público.
         * @param {string} [search] Busca no nome.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaigns: async (page?: number, limit?: number, sortBy?: string, sortType?: ListCampaignsSortTypeEnum, status?: ListCampaignsStatusEnum, targetEntity?: ListCampaignsTargetEntityEnum, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/campaigns`;
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

            if (targetEntity !== undefined) {
                localVarQueryParameter['targetEntity'] = targetEntity;
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
         * Numa campanha em execução, interrompe os envios (`status` `paused`). Numa campanha agendada, desfaz o agendamento: ela volta a rascunho (`draft`), com o `schedule` preservado. Nos outros estados, devolve `400`.  **Permissão do Service Account:** `campaigns.pause`
         * @summary Pausar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        pauseCampaign: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('pauseCampaign', 'id', id)
            const localVarPath = `/api/campaigns/{id}/pause`
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
         * Aponta o que impede ou prejudica o envio. Cada item de `issues` traz onde está o problema e como corrigir. Itens com `severity` `block` impedem o início.  **Permissão do Service Account:** `campaigns.read`
         * @summary Verificar a campanha antes do envio
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        preflightCampaign: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('preflightCampaign', 'id', id)
            const localVarPath = `/api/campaigns/{id}/preflight`
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
         * Devolve o e-mail já com os dados de um contato. Sem `contactId`, usa um contato do público; se o público estiver vazio, devolve `422` com `code: PREVIEW_NO_CONTACT`.  **Permissão do Service Account:** `campaigns.read`
         * @summary Ver a prévia do conteúdo
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {PreviewCampaignContentRequest} [previewCampaignContentRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        previewCampaignContent: async (campaignId: string, id: string, previewCampaignContentRequest?: PreviewCampaignContentRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('previewCampaignContent', 'campaignId', campaignId)
            // verify required parameter 'id' is not null or undefined
            assertParamExists('previewCampaignContent', 'id', id)
            const localVarPath = `/api/campaigns/{campaignId}/templates/{id}/preview`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
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
            localVarRequestOptions.data = serializeDataIfNeeded(previewCampaignContentRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Conta quantos registros casam com um filtro, sem criar campanha. Útil para montar o público antes de gravá-lo.  **Permissão do Service Account:** `campaigns.create`
         * @summary Estimar um público
         * @param {PreviewCampaignSegmentRequest} previewCampaignSegmentRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        previewCampaignSegment: async (previewCampaignSegmentRequest: PreviewCampaignSegmentRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'previewCampaignSegmentRequest' is not null or undefined
            assertParamExists('previewCampaignSegment', 'previewCampaignSegmentRequest', previewCampaignSegmentRequest)
            const localVarPath = `/api/campaigns/segment/preview`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(previewCampaignSegmentRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Marca o conteúdo como o que será enviado. Publicar não envia nada.  **Permissão do Service Account:** `campaigns.update`
         * @summary Publicar conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        publishCampaignContent: async (campaignId: string, id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('publishCampaignContent', 'campaignId', campaignId)
            // verify required parameter 'id' is not null or undefined
            assertParamExists('publishCampaignContent', 'id', id)
            const localVarPath = `/api/campaigns/{campaignId}/templates/{id}/publish`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
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
         * Retoma uma campanha pausada.  **Atenção:** esta operação age sobre destinatários reais. Confira antes com a simulação e a verificação de envio.  **Permissão do Service Account:** `campaigns.resume`
         * @summary Retomar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        resumeCampaign: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('resumeCampaign', 'id', id)
            const localVarPath = `/api/campaigns/{id}/resume`
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
         * Calcula quem receberia a campanha agora, sem enviar nada: tamanho do público, quantos ficam de fora e por quê, e a duração estimada. `warnings` traz o que falta, como `NO_PUBLISHED_TEMPLATE` (nenhum conteúdo publicado).  **Permissão do Service Account:** `campaigns.read`
         * @summary Simular o envio
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        simulateCampaign: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('simulateCampaign', 'id', id)
            const localVarPath = `/api/campaigns/{id}/simulate`
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
         * Inicia o envio (ou agenda, quando `schedule.type` é `scheduled`). Só campanhas em rascunho ou agendadas podem ser iniciadas; nos outros estados, devolve `400`. Se a verificação de envio encontrar um bloqueio, devolve `422` com `code: CAMPAIGN_PREFLIGHT_FAILED` e a lista em `issues`.  **Atenção:** esta operação age sobre destinatários reais. Confira antes com a simulação e a verificação de envio.  **Permissão do Service Account:** `campaigns.start`
         * @summary Iniciar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        startCampaign: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('startCampaign', 'id', id)
            const localVarPath = `/api/campaigns/{id}/start`
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
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Despublicar conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        unpublishCampaignContent: async (campaignId: string, id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('unpublishCampaignContent', 'campaignId', campaignId)
            // verify required parameter 'id' is not null or undefined
            assertParamExists('unpublishCampaignContent', 'id', id)
            const localVarPath = `/api/campaigns/{campaignId}/templates/{id}/unpublish`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
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
         * Envie só os campos que mudam. Numa campanha já agendada (`status` `scheduled`), só a data pode mudar, para outra data futura; para trocar o tipo de envio ou tirar a data, desagende antes com a pausa, senão a resposta é `409` com `code: UNSCHEDULE_BEFORE_CHANGING_SCHEDULE`. A exclusão é feita na plataforma, por um administrador; pela API, use o cancelamento.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar campanha
         * @param {string} id ID do registro.
         * @param {UpdateCampaignRequest} updateCampaignRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateCampaign: async (id: string, updateCampaignRequest: UpdateCampaignRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateCampaign', 'id', id)
            // verify required parameter 'updateCampaignRequest' is not null or undefined
            assertParamExists('updateCampaign', 'updateCampaignRequest', updateCampaignRequest)
            const localVarPath = `/api/campaigns/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateCampaignRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Aceita `enabled` e `config`. Os campos de `config` enviados substituem os atuais; os demais ficam como estão.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar ação da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} actionId ID da ação (&#x60;_id&#x60; devolvido ao criar).
         * @param {UpdateCampaignActionRequest} updateCampaignActionRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateCampaignAction: async (campaignId: string, actionId: string, updateCampaignActionRequest: UpdateCampaignActionRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('updateCampaignAction', 'campaignId', campaignId)
            // verify required parameter 'actionId' is not null or undefined
            assertParamExists('updateCampaignAction', 'actionId', actionId)
            // verify required parameter 'updateCampaignActionRequest' is not null or undefined
            assertParamExists('updateCampaignAction', 'updateCampaignActionRequest', updateCampaignActionRequest)
            const localVarPath = `/api/campaigns/{campaignId}/actions/{actionId}`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
                .replace(`{${"actionId"}}`, encodeURIComponent(String(actionId)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateCampaignActionRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Os campos da raiz (`name`, `subject`) mudam um a um. **`emailSettings`, quando enviado, substitui o conteúdo inteiro do e-mail**: envie-o completo, com `htmlContent`, `textContent` e `preheader`, mesmo para mudar um só. Depois de alterar um conteúdo publicado, confira a verificação de envio.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {UpdateCampaignContentRequest} updateCampaignContentRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateCampaignContent: async (campaignId: string, id: string, updateCampaignContentRequest: UpdateCampaignContentRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'campaignId' is not null or undefined
            assertParamExists('updateCampaignContent', 'campaignId', campaignId)
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateCampaignContent', 'id', id)
            // verify required parameter 'updateCampaignContentRequest' is not null or undefined
            assertParamExists('updateCampaignContent', 'updateCampaignContentRequest', updateCampaignContentRequest)
            const localVarPath = `/api/campaigns/{campaignId}/templates/{id}`
                .replace(`{${"campaignId"}}`, encodeURIComponent(String(campaignId)))
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateCampaignContentRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * CampaignsApi - functional programming interface
 */
export const CampaignsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = CampaignsApiAxiosParamCreator(configuration)
    return {
        /**
         * Encerra a campanha sem enviar o que faltava. Não tem volta: para enviar de novo, duplique a campanha.  **Permissão do Service Account:** `campaigns.cancel`
         * @summary Cancelar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async cancelCampaign(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Campaign>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.cancelCampaign(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.cancelCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Cria a campanha em rascunho (`draft`), com o canal de e-mail. Nada é enviado até a campanha ser iniciada. Em seguida, crie o conteúdo (`POST /api/campaigns/{campaignId}/templates`), publique-o e confira com a simulação.  **Permissão do Service Account:** `campaigns.create`
         * @summary Criar campanha
         * @param {CampaignInput} campaignInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createCampaign(campaignInput: CampaignInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Campaign>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createCampaign(campaignInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.createCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Hoje há um tipo: `create_task`, que cria uma tarefa para cada destinatário.  **Permissão do Service Account:** `campaigns.update`
         * @summary Criar ação da campanha
         * @param {string} campaignId ID da campanha.
         * @param {CampaignAction} campaignAction 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createCampaignAction(campaignId: string, campaignAction: CampaignAction, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<CampaignAction>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createCampaignAction(campaignId, campaignAction, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.createCampaignAction']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Cria o conteúdo de um canal. No e-mail, o assunto vai em `subject`, na raiz, e o corpo em `emailSettings`. O conteúdo nasce não publicado; a resposta traz `emailCheck`, com o que precisa de atenção.  **Permissão do Service Account:** `campaigns.update`
         * @summary Criar conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {CampaignContentInput} campaignContentInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createCampaignContent(campaignId: string, campaignContentInput: CampaignContentInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<CampaignContent>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createCampaignContent(campaignId, campaignContentInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.createCampaignContent']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Excluir ação da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} actionId ID da ação (&#x60;_id&#x60; devolvido ao criar).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteCampaignAction(campaignId: string, actionId: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<UnpublishCampaignContent200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteCampaignAction(campaignId, actionId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.deleteCampaignAction']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Excluir conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteCampaignContent(campaignId: string, id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeleteCampaignContent200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteCampaignContent(campaignId, id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.deleteCampaignContent']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Cria uma cópia em rascunho, com \"(Cópia)\" no nome.  **Permissão do Service Account:** `campaigns.create`
         * @summary Duplicar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async duplicateCampaign(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Campaign>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.duplicateCampaign(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.duplicateCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getCampaign(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Campaign>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getCampaign(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.getCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter ação da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} actionId ID da ação (&#x60;_id&#x60; devolvido ao criar).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getCampaignAction(campaignId: string, actionId: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<CampaignAction>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getCampaignAction(campaignId, actionId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.getCampaignAction']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getCampaignContent(campaignId: string, id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<CampaignContent>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getCampaignContent(campaignId, id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.getCampaignContent']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `campaigns.read-stats`
         * @summary Obter resultados da campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getCampaignStats(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetCampaignStats200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getCampaignStats(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.getCampaignStats']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Totais da conta: campanhas por estado, envios, aberturas e cliques.  **Permissão do Service Account:** `campaigns.read-stats`
         * @summary Obter resultados de todas as campanhas
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getCampaignsGlobalStats(options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetCampaignsGlobalStats200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getCampaignsGlobalStats(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.getCampaignsGlobalStats']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Devolve uma lista simples, sem paginação.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar ações da campanha
         * @param {string} campaignId ID da campanha.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listCampaignActions(campaignId: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<CampaignAction>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listCampaignActions(campaignId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.listCampaignActions']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Canais disponíveis na conta. O `_id` do canal é o `channel` exigido ao criar um conteúdo.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar canais de campanha
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listCampaignChannels(options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<ListCampaignChannels200ResponseInner>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listCampaignChannels(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.listCampaignChannels']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Devolve uma lista simples, sem paginação.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar conteúdos da campanha
         * @param {string} campaignId ID da campanha.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listCampaignContents(campaignId: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<CampaignContent>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listCampaignContents(campaignId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.listCampaignContents']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Um registro por destinatário, com o estado do envio. Ordenação padrão: `sentAt` decrescente. Tamanho de página padrão: 25.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar destinatários da campanha
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListCampaignRecipientsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {ListCampaignRecipientsStatusEnum} [status] Filtra pelo estado do envio.
         * @param {string} [search] Busca no e-mail ou no telefone.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listCampaignRecipients(id: string, page?: number, limit?: number, sortBy?: string, sortType?: ListCampaignRecipientsSortTypeEnum, status?: ListCampaignRecipientsStatusEnum, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListCampaignRecipients200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listCampaignRecipients(id, page, limit, sortBy, sortType, status, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.listCampaignRecipients']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `createdAt` decrescente. Tamanho de página padrão: 15.  **Permissão do Service Account:** `campaigns.list`
         * @summary Listar campanhas
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListCampaignsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {ListCampaignsStatusEnum} [status] Filtra pelo estado.
         * @param {ListCampaignsTargetEntityEnum} [targetEntity] Filtra pelo tipo de registro do público.
         * @param {string} [search] Busca no nome.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listCampaigns(page?: number, limit?: number, sortBy?: string, sortType?: ListCampaignsSortTypeEnum, status?: ListCampaignsStatusEnum, targetEntity?: ListCampaignsTargetEntityEnum, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListCampaigns200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listCampaigns(page, limit, sortBy, sortType, status, targetEntity, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.listCampaigns']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Numa campanha em execução, interrompe os envios (`status` `paused`). Numa campanha agendada, desfaz o agendamento: ela volta a rascunho (`draft`), com o `schedule` preservado. Nos outros estados, devolve `400`.  **Permissão do Service Account:** `campaigns.pause`
         * @summary Pausar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async pauseCampaign(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Campaign>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.pauseCampaign(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.pauseCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Aponta o que impede ou prejudica o envio. Cada item de `issues` traz onde está o problema e como corrigir. Itens com `severity` `block` impedem o início.  **Permissão do Service Account:** `campaigns.read`
         * @summary Verificar a campanha antes do envio
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async preflightCampaign(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PreflightCampaign200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.preflightCampaign(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.preflightCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Devolve o e-mail já com os dados de um contato. Sem `contactId`, usa um contato do público; se o público estiver vazio, devolve `422` com `code: PREVIEW_NO_CONTACT`.  **Permissão do Service Account:** `campaigns.read`
         * @summary Ver a prévia do conteúdo
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {PreviewCampaignContentRequest} [previewCampaignContentRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async previewCampaignContent(campaignId: string, id: string, previewCampaignContentRequest?: PreviewCampaignContentRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PreviewCampaignContent200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.previewCampaignContent(campaignId, id, previewCampaignContentRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.previewCampaignContent']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Conta quantos registros casam com um filtro, sem criar campanha. Útil para montar o público antes de gravá-lo.  **Permissão do Service Account:** `campaigns.create`
         * @summary Estimar um público
         * @param {PreviewCampaignSegmentRequest} previewCampaignSegmentRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async previewCampaignSegment(previewCampaignSegmentRequest: PreviewCampaignSegmentRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PreviewCampaignSegment200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.previewCampaignSegment(previewCampaignSegmentRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.previewCampaignSegment']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Marca o conteúdo como o que será enviado. Publicar não envia nada.  **Permissão do Service Account:** `campaigns.update`
         * @summary Publicar conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async publishCampaignContent(campaignId: string, id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PublishCampaignContent200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.publishCampaignContent(campaignId, id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.publishCampaignContent']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Retoma uma campanha pausada.  **Atenção:** esta operação age sobre destinatários reais. Confira antes com a simulação e a verificação de envio.  **Permissão do Service Account:** `campaigns.resume`
         * @summary Retomar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async resumeCampaign(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Campaign>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.resumeCampaign(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.resumeCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Calcula quem receberia a campanha agora, sem enviar nada: tamanho do público, quantos ficam de fora e por quê, e a duração estimada. `warnings` traz o que falta, como `NO_PUBLISHED_TEMPLATE` (nenhum conteúdo publicado).  **Permissão do Service Account:** `campaigns.read`
         * @summary Simular o envio
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async simulateCampaign(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<SimulateCampaign200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.simulateCampaign(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.simulateCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Inicia o envio (ou agenda, quando `schedule.type` é `scheduled`). Só campanhas em rascunho ou agendadas podem ser iniciadas; nos outros estados, devolve `400`. Se a verificação de envio encontrar um bloqueio, devolve `422` com `code: CAMPAIGN_PREFLIGHT_FAILED` e a lista em `issues`.  **Atenção:** esta operação age sobre destinatários reais. Confira antes com a simulação e a verificação de envio.  **Permissão do Service Account:** `campaigns.start`
         * @summary Iniciar campanha
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async startCampaign(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Campaign>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.startCampaign(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.startCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Despublicar conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async unpublishCampaignContent(campaignId: string, id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<UnpublishCampaignContent200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.unpublishCampaignContent(campaignId, id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.unpublishCampaignContent']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só os campos que mudam. Numa campanha já agendada (`status` `scheduled`), só a data pode mudar, para outra data futura; para trocar o tipo de envio ou tirar a data, desagende antes com a pausa, senão a resposta é `409` com `code: UNSCHEDULE_BEFORE_CHANGING_SCHEDULE`. A exclusão é feita na plataforma, por um administrador; pela API, use o cancelamento.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar campanha
         * @param {string} id ID do registro.
         * @param {UpdateCampaignRequest} updateCampaignRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateCampaign(id: string, updateCampaignRequest: UpdateCampaignRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Campaign>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateCampaign(id, updateCampaignRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.updateCampaign']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Aceita `enabled` e `config`. Os campos de `config` enviados substituem os atuais; os demais ficam como estão.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar ação da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} actionId ID da ação (&#x60;_id&#x60; devolvido ao criar).
         * @param {UpdateCampaignActionRequest} updateCampaignActionRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateCampaignAction(campaignId: string, actionId: string, updateCampaignActionRequest: UpdateCampaignActionRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<CampaignAction>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateCampaignAction(campaignId, actionId, updateCampaignActionRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.updateCampaignAction']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Os campos da raiz (`name`, `subject`) mudam um a um. **`emailSettings`, quando enviado, substitui o conteúdo inteiro do e-mail**: envie-o completo, com `htmlContent`, `textContent` e `preheader`, mesmo para mudar um só. Depois de alterar um conteúdo publicado, confira a verificação de envio.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar conteúdo da campanha
         * @param {string} campaignId ID da campanha.
         * @param {string} id ID do registro.
         * @param {UpdateCampaignContentRequest} updateCampaignContentRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateCampaignContent(campaignId: string, id: string, updateCampaignContentRequest: UpdateCampaignContentRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<CampaignContent>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateCampaignContent(campaignId, id, updateCampaignContentRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['CampaignsApi.updateCampaignContent']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * CampaignsApi - factory interface
 */
export const CampaignsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = CampaignsApiFp(configuration)
    return {
        /**
         * Encerra a campanha sem enviar o que faltava. Não tem volta: para enviar de novo, duplique a campanha.  **Permissão do Service Account:** `campaigns.cancel`
         * @summary Cancelar campanha
         * @param {CampaignsApiCancelCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        cancelCampaign(requestParameters: CampaignsApiCancelCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<Campaign> {
            return localVarFp.cancelCampaign(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Cria a campanha em rascunho (`draft`), com o canal de e-mail. Nada é enviado até a campanha ser iniciada. Em seguida, crie o conteúdo (`POST /api/campaigns/{campaignId}/templates`), publique-o e confira com a simulação.  **Permissão do Service Account:** `campaigns.create`
         * @summary Criar campanha
         * @param {CampaignsApiCreateCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createCampaign(requestParameters: CampaignsApiCreateCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<Campaign> {
            return localVarFp.createCampaign(requestParameters.campaignInput, options).then((request) => request(axios, basePath));
        },
        /**
         * Hoje há um tipo: `create_task`, que cria uma tarefa para cada destinatário.  **Permissão do Service Account:** `campaigns.update`
         * @summary Criar ação da campanha
         * @param {CampaignsApiCreateCampaignActionRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createCampaignAction(requestParameters: CampaignsApiCreateCampaignActionRequest, options?: RawAxiosRequestConfig): AxiosPromise<CampaignAction> {
            return localVarFp.createCampaignAction(requestParameters.campaignId, requestParameters.campaignAction, options).then((request) => request(axios, basePath));
        },
        /**
         * Cria o conteúdo de um canal. No e-mail, o assunto vai em `subject`, na raiz, e o corpo em `emailSettings`. O conteúdo nasce não publicado; a resposta traz `emailCheck`, com o que precisa de atenção.  **Permissão do Service Account:** `campaigns.update`
         * @summary Criar conteúdo da campanha
         * @param {CampaignsApiCreateCampaignContentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createCampaignContent(requestParameters: CampaignsApiCreateCampaignContentRequest, options?: RawAxiosRequestConfig): AxiosPromise<CampaignContent> {
            return localVarFp.createCampaignContent(requestParameters.campaignId, requestParameters.campaignContentInput, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Excluir ação da campanha
         * @param {CampaignsApiDeleteCampaignActionRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteCampaignAction(requestParameters: CampaignsApiDeleteCampaignActionRequest, options?: RawAxiosRequestConfig): AxiosPromise<UnpublishCampaignContent200Response> {
            return localVarFp.deleteCampaignAction(requestParameters.campaignId, requestParameters.actionId, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Excluir conteúdo da campanha
         * @param {CampaignsApiDeleteCampaignContentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteCampaignContent(requestParameters: CampaignsApiDeleteCampaignContentRequest, options?: RawAxiosRequestConfig): AxiosPromise<DeleteCampaignContent200Response> {
            return localVarFp.deleteCampaignContent(requestParameters.campaignId, requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Cria uma cópia em rascunho, com \"(Cópia)\" no nome.  **Permissão do Service Account:** `campaigns.create`
         * @summary Duplicar campanha
         * @param {CampaignsApiDuplicateCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        duplicateCampaign(requestParameters: CampaignsApiDuplicateCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<Campaign> {
            return localVarFp.duplicateCampaign(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter campanha
         * @param {CampaignsApiGetCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaign(requestParameters: CampaignsApiGetCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<Campaign> {
            return localVarFp.getCampaign(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter ação da campanha
         * @param {CampaignsApiGetCampaignActionRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaignAction(requestParameters: CampaignsApiGetCampaignActionRequest, options?: RawAxiosRequestConfig): AxiosPromise<CampaignAction> {
            return localVarFp.getCampaignAction(requestParameters.campaignId, requestParameters.actionId, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `campaigns.read`
         * @summary Obter conteúdo da campanha
         * @param {CampaignsApiGetCampaignContentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaignContent(requestParameters: CampaignsApiGetCampaignContentRequest, options?: RawAxiosRequestConfig): AxiosPromise<CampaignContent> {
            return localVarFp.getCampaignContent(requestParameters.campaignId, requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `campaigns.read-stats`
         * @summary Obter resultados da campanha
         * @param {CampaignsApiGetCampaignStatsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaignStats(requestParameters: CampaignsApiGetCampaignStatsRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetCampaignStats200Response> {
            return localVarFp.getCampaignStats(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Totais da conta: campanhas por estado, envios, aberturas e cliques.  **Permissão do Service Account:** `campaigns.read-stats`
         * @summary Obter resultados de todas as campanhas
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getCampaignsGlobalStats(options?: RawAxiosRequestConfig): AxiosPromise<GetCampaignsGlobalStats200Response> {
            return localVarFp.getCampaignsGlobalStats(options).then((request) => request(axios, basePath));
        },
        /**
         * Devolve uma lista simples, sem paginação.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar ações da campanha
         * @param {CampaignsApiListCampaignActionsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaignActions(requestParameters: CampaignsApiListCampaignActionsRequest, options?: RawAxiosRequestConfig): AxiosPromise<Array<CampaignAction>> {
            return localVarFp.listCampaignActions(requestParameters.campaignId, options).then((request) => request(axios, basePath));
        },
        /**
         * Canais disponíveis na conta. O `_id` do canal é o `channel` exigido ao criar um conteúdo.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar canais de campanha
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaignChannels(options?: RawAxiosRequestConfig): AxiosPromise<Array<ListCampaignChannels200ResponseInner>> {
            return localVarFp.listCampaignChannels(options).then((request) => request(axios, basePath));
        },
        /**
         * Devolve uma lista simples, sem paginação.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar conteúdos da campanha
         * @param {CampaignsApiListCampaignContentsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaignContents(requestParameters: CampaignsApiListCampaignContentsRequest, options?: RawAxiosRequestConfig): AxiosPromise<Array<CampaignContent>> {
            return localVarFp.listCampaignContents(requestParameters.campaignId, options).then((request) => request(axios, basePath));
        },
        /**
         * Um registro por destinatário, com o estado do envio. Ordenação padrão: `sentAt` decrescente. Tamanho de página padrão: 25.  **Permissão do Service Account:** `campaigns.read`
         * @summary Listar destinatários da campanha
         * @param {CampaignsApiListCampaignRecipientsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaignRecipients(requestParameters: CampaignsApiListCampaignRecipientsRequest, options?: RawAxiosRequestConfig): AxiosPromise<ListCampaignRecipients200Response> {
            return localVarFp.listCampaignRecipients(requestParameters.id, requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.status, requestParameters.search, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `createdAt` decrescente. Tamanho de página padrão: 15.  **Permissão do Service Account:** `campaigns.list`
         * @summary Listar campanhas
         * @param {CampaignsApiListCampaignsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listCampaigns(requestParameters: CampaignsApiListCampaignsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListCampaigns200Response> {
            return localVarFp.listCampaigns(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.status, requestParameters.targetEntity, requestParameters.search, options).then((request) => request(axios, basePath));
        },
        /**
         * Numa campanha em execução, interrompe os envios (`status` `paused`). Numa campanha agendada, desfaz o agendamento: ela volta a rascunho (`draft`), com o `schedule` preservado. Nos outros estados, devolve `400`.  **Permissão do Service Account:** `campaigns.pause`
         * @summary Pausar campanha
         * @param {CampaignsApiPauseCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        pauseCampaign(requestParameters: CampaignsApiPauseCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<Campaign> {
            return localVarFp.pauseCampaign(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Aponta o que impede ou prejudica o envio. Cada item de `issues` traz onde está o problema e como corrigir. Itens com `severity` `block` impedem o início.  **Permissão do Service Account:** `campaigns.read`
         * @summary Verificar a campanha antes do envio
         * @param {CampaignsApiPreflightCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        preflightCampaign(requestParameters: CampaignsApiPreflightCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<PreflightCampaign200Response> {
            return localVarFp.preflightCampaign(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Devolve o e-mail já com os dados de um contato. Sem `contactId`, usa um contato do público; se o público estiver vazio, devolve `422` com `code: PREVIEW_NO_CONTACT`.  **Permissão do Service Account:** `campaigns.read`
         * @summary Ver a prévia do conteúdo
         * @param {CampaignsApiPreviewCampaignContentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        previewCampaignContent(requestParameters: CampaignsApiPreviewCampaignContentRequest, options?: RawAxiosRequestConfig): AxiosPromise<PreviewCampaignContent200Response> {
            return localVarFp.previewCampaignContent(requestParameters.campaignId, requestParameters.id, requestParameters.previewCampaignContentRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Conta quantos registros casam com um filtro, sem criar campanha. Útil para montar o público antes de gravá-lo.  **Permissão do Service Account:** `campaigns.create`
         * @summary Estimar um público
         * @param {CampaignsApiPreviewCampaignSegmentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        previewCampaignSegment(requestParameters: CampaignsApiPreviewCampaignSegmentRequest, options?: RawAxiosRequestConfig): AxiosPromise<PreviewCampaignSegment200Response> {
            return localVarFp.previewCampaignSegment(requestParameters.previewCampaignSegmentRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Marca o conteúdo como o que será enviado. Publicar não envia nada.  **Permissão do Service Account:** `campaigns.update`
         * @summary Publicar conteúdo da campanha
         * @param {CampaignsApiPublishCampaignContentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        publishCampaignContent(requestParameters: CampaignsApiPublishCampaignContentRequest, options?: RawAxiosRequestConfig): AxiosPromise<PublishCampaignContent200Response> {
            return localVarFp.publishCampaignContent(requestParameters.campaignId, requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Retoma uma campanha pausada.  **Atenção:** esta operação age sobre destinatários reais. Confira antes com a simulação e a verificação de envio.  **Permissão do Service Account:** `campaigns.resume`
         * @summary Retomar campanha
         * @param {CampaignsApiResumeCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        resumeCampaign(requestParameters: CampaignsApiResumeCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<Campaign> {
            return localVarFp.resumeCampaign(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Calcula quem receberia a campanha agora, sem enviar nada: tamanho do público, quantos ficam de fora e por quê, e a duração estimada. `warnings` traz o que falta, como `NO_PUBLISHED_TEMPLATE` (nenhum conteúdo publicado).  **Permissão do Service Account:** `campaigns.read`
         * @summary Simular o envio
         * @param {CampaignsApiSimulateCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        simulateCampaign(requestParameters: CampaignsApiSimulateCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<SimulateCampaign200Response> {
            return localVarFp.simulateCampaign(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Inicia o envio (ou agenda, quando `schedule.type` é `scheduled`). Só campanhas em rascunho ou agendadas podem ser iniciadas; nos outros estados, devolve `400`. Se a verificação de envio encontrar um bloqueio, devolve `422` com `code: CAMPAIGN_PREFLIGHT_FAILED` e a lista em `issues`.  **Atenção:** esta operação age sobre destinatários reais. Confira antes com a simulação e a verificação de envio.  **Permissão do Service Account:** `campaigns.start`
         * @summary Iniciar campanha
         * @param {CampaignsApiStartCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        startCampaign(requestParameters: CampaignsApiStartCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<Campaign> {
            return localVarFp.startCampaign(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `campaigns.update`
         * @summary Despublicar conteúdo da campanha
         * @param {CampaignsApiUnpublishCampaignContentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        unpublishCampaignContent(requestParameters: CampaignsApiUnpublishCampaignContentRequest, options?: RawAxiosRequestConfig): AxiosPromise<UnpublishCampaignContent200Response> {
            return localVarFp.unpublishCampaignContent(requestParameters.campaignId, requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só os campos que mudam. Numa campanha já agendada (`status` `scheduled`), só a data pode mudar, para outra data futura; para trocar o tipo de envio ou tirar a data, desagende antes com a pausa, senão a resposta é `409` com `code: UNSCHEDULE_BEFORE_CHANGING_SCHEDULE`. A exclusão é feita na plataforma, por um administrador; pela API, use o cancelamento.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar campanha
         * @param {CampaignsApiUpdateCampaignRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateCampaign(requestParameters: CampaignsApiUpdateCampaignRequest, options?: RawAxiosRequestConfig): AxiosPromise<Campaign> {
            return localVarFp.updateCampaign(requestParameters.id, requestParameters.updateCampaignRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Aceita `enabled` e `config`. Os campos de `config` enviados substituem os atuais; os demais ficam como estão.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar ação da campanha
         * @param {CampaignsApiUpdateCampaignActionRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateCampaignAction(requestParameters: CampaignsApiUpdateCampaignActionRequest, options?: RawAxiosRequestConfig): AxiosPromise<CampaignAction> {
            return localVarFp.updateCampaignAction(requestParameters.campaignId, requestParameters.actionId, requestParameters.updateCampaignActionRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Os campos da raiz (`name`, `subject`) mudam um a um. **`emailSettings`, quando enviado, substitui o conteúdo inteiro do e-mail**: envie-o completo, com `htmlContent`, `textContent` e `preheader`, mesmo para mudar um só. Depois de alterar um conteúdo publicado, confira a verificação de envio.  **Permissão do Service Account:** `campaigns.update`
         * @summary Atualizar conteúdo da campanha
         * @param {CampaignsApiUpdateCampaignContentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateCampaignContent(requestParameters: CampaignsApiUpdateCampaignContentRequest, options?: RawAxiosRequestConfig): AxiosPromise<CampaignContent> {
            return localVarFp.updateCampaignContent(requestParameters.campaignId, requestParameters.id, requestParameters.updateCampaignContentRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for cancelCampaign operation in CampaignsApi.
 */
export interface CampaignsApiCancelCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for createCampaign operation in CampaignsApi.
 */
export interface CampaignsApiCreateCampaignRequest {
    readonly campaignInput: CampaignInput
}

/**
 * Request parameters for createCampaignAction operation in CampaignsApi.
 */
export interface CampaignsApiCreateCampaignActionRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    readonly campaignAction: CampaignAction
}

/**
 * Request parameters for createCampaignContent operation in CampaignsApi.
 */
export interface CampaignsApiCreateCampaignContentRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    readonly campaignContentInput: CampaignContentInput
}

/**
 * Request parameters for deleteCampaignAction operation in CampaignsApi.
 */
export interface CampaignsApiDeleteCampaignActionRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID da ação (&#x60;_id&#x60; devolvido ao criar).
     */
    readonly actionId: string
}

/**
 * Request parameters for deleteCampaignContent operation in CampaignsApi.
 */
export interface CampaignsApiDeleteCampaignContentRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for duplicateCampaign operation in CampaignsApi.
 */
export interface CampaignsApiDuplicateCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getCampaign operation in CampaignsApi.
 */
export interface CampaignsApiGetCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getCampaignAction operation in CampaignsApi.
 */
export interface CampaignsApiGetCampaignActionRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID da ação (&#x60;_id&#x60; devolvido ao criar).
     */
    readonly actionId: string
}

/**
 * Request parameters for getCampaignContent operation in CampaignsApi.
 */
export interface CampaignsApiGetCampaignContentRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getCampaignStats operation in CampaignsApi.
 */
export interface CampaignsApiGetCampaignStatsRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listCampaignActions operation in CampaignsApi.
 */
export interface CampaignsApiListCampaignActionsRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string
}

/**
 * Request parameters for listCampaignContents operation in CampaignsApi.
 */
export interface CampaignsApiListCampaignContentsRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string
}

/**
 * Request parameters for listCampaignRecipients operation in CampaignsApi.
 */
export interface CampaignsApiListCampaignRecipientsRequest {
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

    /**
     * Campo de ordenação. O padrão varia por recurso.
     */
    readonly sortBy?: string

    /**
     * Direção da ordenação.
     */
    readonly sortType?: ListCampaignRecipientsSortTypeEnum

    /**
     * Filtra pelo estado do envio.
     */
    readonly status?: ListCampaignRecipientsStatusEnum

    /**
     * Busca no e-mail ou no telefone.
     */
    readonly search?: string
}

/**
 * Request parameters for listCampaigns operation in CampaignsApi.
 */
export interface CampaignsApiListCampaignsRequest {
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
    readonly sortType?: ListCampaignsSortTypeEnum

    /**
     * Filtra pelo estado.
     */
    readonly status?: ListCampaignsStatusEnum

    /**
     * Filtra pelo tipo de registro do público.
     */
    readonly targetEntity?: ListCampaignsTargetEntityEnum

    /**
     * Busca no nome.
     */
    readonly search?: string
}

/**
 * Request parameters for pauseCampaign operation in CampaignsApi.
 */
export interface CampaignsApiPauseCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for preflightCampaign operation in CampaignsApi.
 */
export interface CampaignsApiPreflightCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for previewCampaignContent operation in CampaignsApi.
 */
export interface CampaignsApiPreviewCampaignContentRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID do registro.
     */
    readonly id: string

    readonly previewCampaignContentRequest?: PreviewCampaignContentRequest
}

/**
 * Request parameters for previewCampaignSegment operation in CampaignsApi.
 */
export interface CampaignsApiPreviewCampaignSegmentRequest {
    readonly previewCampaignSegmentRequest: PreviewCampaignSegmentRequest
}

/**
 * Request parameters for publishCampaignContent operation in CampaignsApi.
 */
export interface CampaignsApiPublishCampaignContentRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for resumeCampaign operation in CampaignsApi.
 */
export interface CampaignsApiResumeCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for simulateCampaign operation in CampaignsApi.
 */
export interface CampaignsApiSimulateCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for startCampaign operation in CampaignsApi.
 */
export interface CampaignsApiStartCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for unpublishCampaignContent operation in CampaignsApi.
 */
export interface CampaignsApiUnpublishCampaignContentRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for updateCampaign operation in CampaignsApi.
 */
export interface CampaignsApiUpdateCampaignRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly updateCampaignRequest: UpdateCampaignRequest
}

/**
 * Request parameters for updateCampaignAction operation in CampaignsApi.
 */
export interface CampaignsApiUpdateCampaignActionRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID da ação (&#x60;_id&#x60; devolvido ao criar).
     */
    readonly actionId: string

    readonly updateCampaignActionRequest: UpdateCampaignActionRequest
}

/**
 * Request parameters for updateCampaignContent operation in CampaignsApi.
 */
export interface CampaignsApiUpdateCampaignContentRequest {
    /**
     * ID da campanha.
     */
    readonly campaignId: string

    /**
     * ID do registro.
     */
    readonly id: string

    readonly updateCampaignContentRequest: UpdateCampaignContentRequest
}

/**
 * CampaignsApi - object-oriented interface
 */
export class CampaignsApi extends BaseAPI {
    /**
     * Encerra a campanha sem enviar o que faltava. Não tem volta: para enviar de novo, duplique a campanha.  **Permissão do Service Account:** `campaigns.cancel`
     * @summary Cancelar campanha
     * @param {CampaignsApiCancelCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public cancelCampaign(requestParameters: CampaignsApiCancelCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).cancelCampaign(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Cria a campanha em rascunho (`draft`), com o canal de e-mail. Nada é enviado até a campanha ser iniciada. Em seguida, crie o conteúdo (`POST /api/campaigns/{campaignId}/templates`), publique-o e confira com a simulação.  **Permissão do Service Account:** `campaigns.create`
     * @summary Criar campanha
     * @param {CampaignsApiCreateCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createCampaign(requestParameters: CampaignsApiCreateCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).createCampaign(requestParameters.campaignInput, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Hoje há um tipo: `create_task`, que cria uma tarefa para cada destinatário.  **Permissão do Service Account:** `campaigns.update`
     * @summary Criar ação da campanha
     * @param {CampaignsApiCreateCampaignActionRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createCampaignAction(requestParameters: CampaignsApiCreateCampaignActionRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).createCampaignAction(requestParameters.campaignId, requestParameters.campaignAction, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Cria o conteúdo de um canal. No e-mail, o assunto vai em `subject`, na raiz, e o corpo em `emailSettings`. O conteúdo nasce não publicado; a resposta traz `emailCheck`, com o que precisa de atenção.  **Permissão do Service Account:** `campaigns.update`
     * @summary Criar conteúdo da campanha
     * @param {CampaignsApiCreateCampaignContentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createCampaignContent(requestParameters: CampaignsApiCreateCampaignContentRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).createCampaignContent(requestParameters.campaignId, requestParameters.campaignContentInput, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `campaigns.update`
     * @summary Excluir ação da campanha
     * @param {CampaignsApiDeleteCampaignActionRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteCampaignAction(requestParameters: CampaignsApiDeleteCampaignActionRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).deleteCampaignAction(requestParameters.campaignId, requestParameters.actionId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `campaigns.update`
     * @summary Excluir conteúdo da campanha
     * @param {CampaignsApiDeleteCampaignContentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteCampaignContent(requestParameters: CampaignsApiDeleteCampaignContentRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).deleteCampaignContent(requestParameters.campaignId, requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Cria uma cópia em rascunho, com \"(Cópia)\" no nome.  **Permissão do Service Account:** `campaigns.create`
     * @summary Duplicar campanha
     * @param {CampaignsApiDuplicateCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public duplicateCampaign(requestParameters: CampaignsApiDuplicateCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).duplicateCampaign(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `campaigns.read`
     * @summary Obter campanha
     * @param {CampaignsApiGetCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getCampaign(requestParameters: CampaignsApiGetCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).getCampaign(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `campaigns.read`
     * @summary Obter ação da campanha
     * @param {CampaignsApiGetCampaignActionRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getCampaignAction(requestParameters: CampaignsApiGetCampaignActionRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).getCampaignAction(requestParameters.campaignId, requestParameters.actionId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `campaigns.read`
     * @summary Obter conteúdo da campanha
     * @param {CampaignsApiGetCampaignContentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getCampaignContent(requestParameters: CampaignsApiGetCampaignContentRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).getCampaignContent(requestParameters.campaignId, requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `campaigns.read-stats`
     * @summary Obter resultados da campanha
     * @param {CampaignsApiGetCampaignStatsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getCampaignStats(requestParameters: CampaignsApiGetCampaignStatsRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).getCampaignStats(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Totais da conta: campanhas por estado, envios, aberturas e cliques.  **Permissão do Service Account:** `campaigns.read-stats`
     * @summary Obter resultados de todas as campanhas
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getCampaignsGlobalStats(options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).getCampaignsGlobalStats(options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Devolve uma lista simples, sem paginação.  **Permissão do Service Account:** `campaigns.read`
     * @summary Listar ações da campanha
     * @param {CampaignsApiListCampaignActionsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listCampaignActions(requestParameters: CampaignsApiListCampaignActionsRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).listCampaignActions(requestParameters.campaignId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Canais disponíveis na conta. O `_id` do canal é o `channel` exigido ao criar um conteúdo.  **Permissão do Service Account:** `campaigns.read`
     * @summary Listar canais de campanha
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listCampaignChannels(options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).listCampaignChannels(options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Devolve uma lista simples, sem paginação.  **Permissão do Service Account:** `campaigns.read`
     * @summary Listar conteúdos da campanha
     * @param {CampaignsApiListCampaignContentsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listCampaignContents(requestParameters: CampaignsApiListCampaignContentsRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).listCampaignContents(requestParameters.campaignId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Um registro por destinatário, com o estado do envio. Ordenação padrão: `sentAt` decrescente. Tamanho de página padrão: 25.  **Permissão do Service Account:** `campaigns.read`
     * @summary Listar destinatários da campanha
     * @param {CampaignsApiListCampaignRecipientsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listCampaignRecipients(requestParameters: CampaignsApiListCampaignRecipientsRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).listCampaignRecipients(requestParameters.id, requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.status, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `createdAt` decrescente. Tamanho de página padrão: 15.  **Permissão do Service Account:** `campaigns.list`
     * @summary Listar campanhas
     * @param {CampaignsApiListCampaignsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listCampaigns(requestParameters: CampaignsApiListCampaignsRequest = {}, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).listCampaigns(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.status, requestParameters.targetEntity, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Numa campanha em execução, interrompe os envios (`status` `paused`). Numa campanha agendada, desfaz o agendamento: ela volta a rascunho (`draft`), com o `schedule` preservado. Nos outros estados, devolve `400`.  **Permissão do Service Account:** `campaigns.pause`
     * @summary Pausar campanha
     * @param {CampaignsApiPauseCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public pauseCampaign(requestParameters: CampaignsApiPauseCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).pauseCampaign(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Aponta o que impede ou prejudica o envio. Cada item de `issues` traz onde está o problema e como corrigir. Itens com `severity` `block` impedem o início.  **Permissão do Service Account:** `campaigns.read`
     * @summary Verificar a campanha antes do envio
     * @param {CampaignsApiPreflightCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public preflightCampaign(requestParameters: CampaignsApiPreflightCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).preflightCampaign(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Devolve o e-mail já com os dados de um contato. Sem `contactId`, usa um contato do público; se o público estiver vazio, devolve `422` com `code: PREVIEW_NO_CONTACT`.  **Permissão do Service Account:** `campaigns.read`
     * @summary Ver a prévia do conteúdo
     * @param {CampaignsApiPreviewCampaignContentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public previewCampaignContent(requestParameters: CampaignsApiPreviewCampaignContentRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).previewCampaignContent(requestParameters.campaignId, requestParameters.id, requestParameters.previewCampaignContentRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Conta quantos registros casam com um filtro, sem criar campanha. Útil para montar o público antes de gravá-lo.  **Permissão do Service Account:** `campaigns.create`
     * @summary Estimar um público
     * @param {CampaignsApiPreviewCampaignSegmentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public previewCampaignSegment(requestParameters: CampaignsApiPreviewCampaignSegmentRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).previewCampaignSegment(requestParameters.previewCampaignSegmentRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Marca o conteúdo como o que será enviado. Publicar não envia nada.  **Permissão do Service Account:** `campaigns.update`
     * @summary Publicar conteúdo da campanha
     * @param {CampaignsApiPublishCampaignContentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public publishCampaignContent(requestParameters: CampaignsApiPublishCampaignContentRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).publishCampaignContent(requestParameters.campaignId, requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Retoma uma campanha pausada.  **Atenção:** esta operação age sobre destinatários reais. Confira antes com a simulação e a verificação de envio.  **Permissão do Service Account:** `campaigns.resume`
     * @summary Retomar campanha
     * @param {CampaignsApiResumeCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public resumeCampaign(requestParameters: CampaignsApiResumeCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).resumeCampaign(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Calcula quem receberia a campanha agora, sem enviar nada: tamanho do público, quantos ficam de fora e por quê, e a duração estimada. `warnings` traz o que falta, como `NO_PUBLISHED_TEMPLATE` (nenhum conteúdo publicado).  **Permissão do Service Account:** `campaigns.read`
     * @summary Simular o envio
     * @param {CampaignsApiSimulateCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public simulateCampaign(requestParameters: CampaignsApiSimulateCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).simulateCampaign(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Inicia o envio (ou agenda, quando `schedule.type` é `scheduled`). Só campanhas em rascunho ou agendadas podem ser iniciadas; nos outros estados, devolve `400`. Se a verificação de envio encontrar um bloqueio, devolve `422` com `code: CAMPAIGN_PREFLIGHT_FAILED` e a lista em `issues`.  **Atenção:** esta operação age sobre destinatários reais. Confira antes com a simulação e a verificação de envio.  **Permissão do Service Account:** `campaigns.start`
     * @summary Iniciar campanha
     * @param {CampaignsApiStartCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public startCampaign(requestParameters: CampaignsApiStartCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).startCampaign(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `campaigns.update`
     * @summary Despublicar conteúdo da campanha
     * @param {CampaignsApiUnpublishCampaignContentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public unpublishCampaignContent(requestParameters: CampaignsApiUnpublishCampaignContentRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).unpublishCampaignContent(requestParameters.campaignId, requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só os campos que mudam. Numa campanha já agendada (`status` `scheduled`), só a data pode mudar, para outra data futura; para trocar o tipo de envio ou tirar a data, desagende antes com a pausa, senão a resposta é `409` com `code: UNSCHEDULE_BEFORE_CHANGING_SCHEDULE`. A exclusão é feita na plataforma, por um administrador; pela API, use o cancelamento.  **Permissão do Service Account:** `campaigns.update`
     * @summary Atualizar campanha
     * @param {CampaignsApiUpdateCampaignRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateCampaign(requestParameters: CampaignsApiUpdateCampaignRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).updateCampaign(requestParameters.id, requestParameters.updateCampaignRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Aceita `enabled` e `config`. Os campos de `config` enviados substituem os atuais; os demais ficam como estão.  **Permissão do Service Account:** `campaigns.update`
     * @summary Atualizar ação da campanha
     * @param {CampaignsApiUpdateCampaignActionRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateCampaignAction(requestParameters: CampaignsApiUpdateCampaignActionRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).updateCampaignAction(requestParameters.campaignId, requestParameters.actionId, requestParameters.updateCampaignActionRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Os campos da raiz (`name`, `subject`) mudam um a um. **`emailSettings`, quando enviado, substitui o conteúdo inteiro do e-mail**: envie-o completo, com `htmlContent`, `textContent` e `preheader`, mesmo para mudar um só. Depois de alterar um conteúdo publicado, confira a verificação de envio.  **Permissão do Service Account:** `campaigns.update`
     * @summary Atualizar conteúdo da campanha
     * @param {CampaignsApiUpdateCampaignContentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateCampaignContent(requestParameters: CampaignsApiUpdateCampaignContentRequest, options?: RawAxiosRequestConfig) {
        return CampaignsApiFp(this.configuration).updateCampaignContent(requestParameters.campaignId, requestParameters.id, requestParameters.updateCampaignContentRequest, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListCampaignRecipientsSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListCampaignRecipientsSortTypeEnum = typeof ListCampaignRecipientsSortTypeEnum[keyof typeof ListCampaignRecipientsSortTypeEnum];
export const ListCampaignRecipientsStatusEnum = {
    queued: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    opened: 'opened',
    clicked: 'clicked',
    bounced: 'bounced',
    complained: 'complained',
    unsubscribed: 'unsubscribed',
    failed: 'failed',
    cancelled: 'cancelled',
} as const;
export type ListCampaignRecipientsStatusEnum = typeof ListCampaignRecipientsStatusEnum[keyof typeof ListCampaignRecipientsStatusEnum];
export const ListCampaignsSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListCampaignsSortTypeEnum = typeof ListCampaignsSortTypeEnum[keyof typeof ListCampaignsSortTypeEnum];
export const ListCampaignsStatusEnum = {
    draft: 'draft',
    scheduled: 'scheduled',
    running: 'running',
    paused: 'paused',
    completed: 'completed',
    cancelled: 'cancelled',
    active: 'active',
} as const;
export type ListCampaignsStatusEnum = typeof ListCampaignsStatusEnum[keyof typeof ListCampaignsStatusEnum];
export const ListCampaignsTargetEntityEnum = {
    contact: 'contact',
    deal: 'deal',
    organization: 'organization',
    customer: 'customer',
    lead: 'lead',
    prospect: 'prospect',
} as const;
export type ListCampaignsTargetEntityEnum = typeof ListCampaignsTargetEntityEnum[keyof typeof ListCampaignsTargetEntityEnum];

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
import type { CreateDashboardRequest } from '../models';
// @ts-ignore
import type { CreateFilterPresetRequest } from '../models';
// @ts-ignore
import type { CreateWidgetRequest } from '../models';
// @ts-ignore
import type { Dashboard } from '../models';
// @ts-ignore
import type { DeleteDashboard200Response } from '../models';
// @ts-ignore
import type { DuplicateDashboardRequest } from '../models';
// @ts-ignore
import type { FilterPreset } from '../models';
// @ts-ignore
import type { GetWidgetContent200Response } from '../models';
// @ts-ignore
import type { GetWidgetRuleset200Response } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListWidgetResults200Response } from '../models';
// @ts-ignore
import type { UpdateFilterPresetRequest } from '../models';
// @ts-ignore
import type { UpdateWidgetRuleset200Response } from '../models';
// @ts-ignore
import type { UpdateWidgetRulesetRequest } from '../models';
// @ts-ignore
import type { Widget } from '../models';
// @ts-ignore
import type { WidgetInput } from '../models';
/**
 * DashboardsApi - axios parameter creator
 */
export const DashboardsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * O único campo obrigatório é `title`. Para a credencial ver o dashboard que criou, use `forModel: Staff` com o ID do usuário dela em `staffs`.  **Permissão do Service Account:** `dashboards.create`
         * @summary Criar dashboard
         * @param {CreateDashboardRequest} createDashboardRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createDashboard: async (createDashboardRequest: CreateDashboardRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createDashboardRequest' is not null or undefined
            assertParamExists('createDashboard', 'createDashboardRequest', createDashboardRequest)
            const localVarPath = `/api/dashboards`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createDashboardRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * O nome não pode repetir no mesmo dashboard (`409`).
         * @summary Criar predefinição de filtro
         * @param {string} dashboard ID do dashboard.
         * @param {CreateFilterPresetRequest} createFilterPresetRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createFilterPreset: async (dashboard: string, createFilterPresetRequest: CreateFilterPresetRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('createFilterPreset', 'dashboard', dashboard)
            // verify required parameter 'createFilterPresetRequest' is not null or undefined
            assertParamExists('createFilterPreset', 'createFilterPresetRequest', createFilterPresetRequest)
            const localVarPath = `/api/dashboards/{dashboard}/filter-presets`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(createFilterPresetRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Obrigatórios: `title`, `displayAs`, `content.datasource`, `sizeX`, `sizeY`, `row` e `col`.  As regras de `content.filter.ruleset` não são validadas na gravação: um operador ou campo inexistente é aceito e o widget passa a devolver resultado vazio. Confira os nomes em `GET /api/resource-keywords`.  **Permissão do Service Account:** `dashboards.create-widget`
         * @summary Criar widget
         * @param {string} dashboard ID do dashboard.
         * @param {CreateWidgetRequest} createWidgetRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createWidget: async (dashboard: string, createWidgetRequest: CreateWidgetRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('createWidget', 'dashboard', dashboard)
            // verify required parameter 'createWidgetRequest' is not null or undefined
            assertParamExists('createWidget', 'createWidgetRequest', createWidgetRequest)
            const localVarPath = `/api/dashboards/{dashboard}/widgets`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(createWidgetRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Exclui o dashboard e os widgets dele. Não há como desfazer.  **Permissão do Service Account:** `dashboards.delete`
         * @summary Excluir dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteDashboard: async (dashboard: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('deleteDashboard', 'dashboard', dashboard)
            const localVarPath = `/api/dashboards/{dashboard}`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)));
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
         * @summary Excluir predefinição de filtro
         * @param {string} dashboard ID do dashboard.
         * @param {string} preset ID da predefinição.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteFilterPreset: async (dashboard: string, preset: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('deleteFilterPreset', 'dashboard', dashboard)
            // verify required parameter 'preset' is not null or undefined
            assertParamExists('deleteFilterPreset', 'preset', preset)
            const localVarPath = `/api/dashboards/{dashboard}/filter-presets/{preset}`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"preset"}}`, encodeURIComponent(String(preset)));
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
         * **Permissão do Service Account:** `dashboards.delete-widget`
         * @summary Excluir widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteWidget: async (dashboard: string, widget: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('deleteWidget', 'dashboard', dashboard)
            // verify required parameter 'widget' is not null or undefined
            assertParamExists('deleteWidget', 'widget', widget)
            const localVarPath = `/api/dashboards/{dashboard}/widgets/{widget}`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"widget"}}`, encodeURIComponent(String(widget)));
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
         * Cria uma cópia com os mesmos widgets. A cópia recebe o título \"Cópia de …\"; o `title` do corpo é obrigatório, mas não é usado.
         * @summary Duplicar dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {DuplicateDashboardRequest} duplicateDashboardRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        duplicateDashboard: async (dashboard: string, duplicateDashboardRequest: DuplicateDashboardRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('duplicateDashboard', 'dashboard', dashboard)
            // verify required parameter 'duplicateDashboardRequest' is not null or undefined
            assertParamExists('duplicateDashboard', 'duplicateDashboardRequest', duplicateDashboardRequest)
            const localVarPath = `/api/dashboards/{dashboard}/duplicate`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(duplicateDashboardRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Obter dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDashboard: async (dashboard: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('getDashboard', 'dashboard', dashboard)
            const localVarPath = `/api/dashboards/{dashboard}`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)));
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
         * @summary Obter widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWidget: async (dashboard: string, widget: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('getWidget', 'dashboard', dashboard)
            // verify required parameter 'widget' is not null or undefined
            assertParamExists('getWidget', 'widget', widget)
            const localVarPath = `/api/dashboards/{dashboard}/widgets/{widget}`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"widget"}}`, encodeURIComponent(String(widget)));
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
         * O formato depende de `displayAs`:  - `NUMBER`: `{ \"value\": 12 }`. - `PERCENTAGE`: `{ \"value\": 3, \"total\": 1, \"percentage\": 300 }`, em que `percentage` é `value ÷ total × 100`. - Gráficos: `{ \"labels\": [...], \"data\": [...] }`, um valor por rótulo. - Gráficos com `seriesBy`: `{ \"series\": [...], \"labels\": [...], \"data\": [[{ \"x\": rótulo, \"y\": valor }]] }`, uma lista por série.
         * @summary Obter o resultado do widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWidgetContent: async (dashboard: string, widget: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('getWidgetContent', 'dashboard', dashboard)
            // verify required parameter 'widget' is not null or undefined
            assertParamExists('getWidgetContent', 'widget', widget)
            const localVarPath = `/api/dashboards/{dashboard}/widgets/{widget}/content`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"widget"}}`, encodeURIComponent(String(widget)));
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
         * @summary Obter o filtro do widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWidgetRuleset: async (dashboard: string, widget: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('getWidgetRuleset', 'dashboard', dashboard)
            // verify required parameter 'widget' is not null or undefined
            assertParamExists('getWidgetRuleset', 'widget', widget)
            const localVarPath = `/api/dashboards/{dashboard}/widgets/{widget}/ruleset`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"widget"}}`, encodeURIComponent(String(widget)));
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
         * Devolve os dashboards que o usuário da credencial vê. Lista simples, sem paginação.
         * @summary Listar dashboards
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listDashboards: async (options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/dashboards`;
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
         * Filtros prontos que quem abre o dashboard pode aplicar. Lista simples, sem paginação.
         * @summary Listar predefinições de filtro
         * @param {string} dashboard ID do dashboard.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listFilterPresets: async (dashboard: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('listFilterPresets', 'dashboard', dashboard)
            const localVarPath = `/api/dashboards/{dashboard}/filter-presets`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)));
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
         * Devolve os registros que o widget contou, com as colunas de `reportfields`. Cada coluna vem com o `slug` do campo, trocando o ponto por sublinhado (`deal.amount` vira `deal_amount`).
         * @summary Listar os registros por trás do widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWidgetResults: async (dashboard: string, widget: string, page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('listWidgetResults', 'dashboard', dashboard)
            // verify required parameter 'widget' is not null or undefined
            assertParamExists('listWidgetResults', 'widget', widget)
            const localVarPath = `/api/dashboards/{dashboard}/widgets/{widget}/results/list`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"widget"}}`, encodeURIComponent(String(widget)));
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
         * Lista simples, sem paginação.
         * @summary Listar widgets do dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWidgets: async (dashboard: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('listWidgets', 'dashboard', dashboard)
            const localVarPath = `/api/dashboards/{dashboard}/widgets`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)));
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
         * Envie `title` e os campos que mudam.
         * @summary Atualizar dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {CreateDashboardRequest} createDashboardRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateDashboard: async (dashboard: string, createDashboardRequest: CreateDashboardRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('updateDashboard', 'dashboard', dashboard)
            // verify required parameter 'createDashboardRequest' is not null or undefined
            assertParamExists('updateDashboard', 'createDashboardRequest', createDashboardRequest)
            const localVarPath = `/api/dashboards/{dashboard}`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(createDashboardRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Atualizar predefinição de filtro
         * @param {string} dashboard ID do dashboard.
         * @param {string} preset ID da predefinição.
         * @param {UpdateFilterPresetRequest} updateFilterPresetRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateFilterPreset: async (dashboard: string, preset: string, updateFilterPresetRequest: UpdateFilterPresetRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('updateFilterPreset', 'dashboard', dashboard)
            // verify required parameter 'preset' is not null or undefined
            assertParamExists('updateFilterPreset', 'preset', preset)
            // verify required parameter 'updateFilterPresetRequest' is not null or undefined
            assertParamExists('updateFilterPreset', 'updateFilterPresetRequest', updateFilterPresetRequest)
            const localVarPath = `/api/dashboards/{dashboard}/filter-presets/{preset}`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"preset"}}`, encodeURIComponent(String(preset)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateFilterPresetRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `dashboards.change-widget-position`
         * @summary Atualizar widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {WidgetInput} widgetInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateWidget: async (dashboard: string, widget: string, widgetInput: WidgetInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('updateWidget', 'dashboard', dashboard)
            // verify required parameter 'widget' is not null or undefined
            assertParamExists('updateWidget', 'widget', widget)
            // verify required parameter 'widgetInput' is not null or undefined
            assertParamExists('updateWidget', 'widgetInput', widgetInput)
            const localVarPath = `/api/dashboards/{dashboard}/widgets/{widget}`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"widget"}}`, encodeURIComponent(String(widget)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(widgetInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Substitui `content.filter.ruleset` e descarta o resultado guardado, para o próximo cálculo já usar o filtro novo.
         * @summary Trocar o filtro do widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {UpdateWidgetRulesetRequest} updateWidgetRulesetRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateWidgetRuleset: async (dashboard: string, widget: string, updateWidgetRulesetRequest: UpdateWidgetRulesetRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'dashboard' is not null or undefined
            assertParamExists('updateWidgetRuleset', 'dashboard', dashboard)
            // verify required parameter 'widget' is not null or undefined
            assertParamExists('updateWidgetRuleset', 'widget', widget)
            // verify required parameter 'updateWidgetRulesetRequest' is not null or undefined
            assertParamExists('updateWidgetRuleset', 'updateWidgetRulesetRequest', updateWidgetRulesetRequest)
            const localVarPath = `/api/dashboards/{dashboard}/widgets/{widget}/ruleset`
                .replace(`{${"dashboard"}}`, encodeURIComponent(String(dashboard)))
                .replace(`{${"widget"}}`, encodeURIComponent(String(widget)));
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateWidgetRulesetRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * DashboardsApi - functional programming interface
 */
export const DashboardsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = DashboardsApiAxiosParamCreator(configuration)
    return {
        /**
         * O único campo obrigatório é `title`. Para a credencial ver o dashboard que criou, use `forModel: Staff` com o ID do usuário dela em `staffs`.  **Permissão do Service Account:** `dashboards.create`
         * @summary Criar dashboard
         * @param {CreateDashboardRequest} createDashboardRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createDashboard(createDashboardRequest: CreateDashboardRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Dashboard>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createDashboard(createDashboardRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.createDashboard']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * O nome não pode repetir no mesmo dashboard (`409`).
         * @summary Criar predefinição de filtro
         * @param {string} dashboard ID do dashboard.
         * @param {CreateFilterPresetRequest} createFilterPresetRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createFilterPreset(dashboard: string, createFilterPresetRequest: CreateFilterPresetRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<FilterPreset>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createFilterPreset(dashboard, createFilterPresetRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.createFilterPreset']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Obrigatórios: `title`, `displayAs`, `content.datasource`, `sizeX`, `sizeY`, `row` e `col`.  As regras de `content.filter.ruleset` não são validadas na gravação: um operador ou campo inexistente é aceito e o widget passa a devolver resultado vazio. Confira os nomes em `GET /api/resource-keywords`.  **Permissão do Service Account:** `dashboards.create-widget`
         * @summary Criar widget
         * @param {string} dashboard ID do dashboard.
         * @param {CreateWidgetRequest} createWidgetRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createWidget(dashboard: string, createWidgetRequest: CreateWidgetRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Widget>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createWidget(dashboard, createWidgetRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.createWidget']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Exclui o dashboard e os widgets dele. Não há como desfazer.  **Permissão do Service Account:** `dashboards.delete`
         * @summary Excluir dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteDashboard(dashboard: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeleteDashboard200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteDashboard(dashboard, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.deleteDashboard']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Excluir predefinição de filtro
         * @param {string} dashboard ID do dashboard.
         * @param {string} preset ID da predefinição.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteFilterPreset(dashboard: string, preset: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeleteDashboard200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteFilterPreset(dashboard, preset, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.deleteFilterPreset']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `dashboards.delete-widget`
         * @summary Excluir widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteWidget(dashboard: string, widget: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteWidget(dashboard, widget, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.deleteWidget']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Cria uma cópia com os mesmos widgets. A cópia recebe o título \"Cópia de …\"; o `title` do corpo é obrigatório, mas não é usado.
         * @summary Duplicar dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {DuplicateDashboardRequest} duplicateDashboardRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async duplicateDashboard(dashboard: string, duplicateDashboardRequest: DuplicateDashboardRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Dashboard>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.duplicateDashboard(dashboard, duplicateDashboardRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.duplicateDashboard']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Obter dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getDashboard(dashboard: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Dashboard>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getDashboard(dashboard, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.getDashboard']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Obter widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getWidget(dashboard: string, widget: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Widget>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getWidget(dashboard, widget, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.getWidget']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * O formato depende de `displayAs`:  - `NUMBER`: `{ \"value\": 12 }`. - `PERCENTAGE`: `{ \"value\": 3, \"total\": 1, \"percentage\": 300 }`, em que `percentage` é `value ÷ total × 100`. - Gráficos: `{ \"labels\": [...], \"data\": [...] }`, um valor por rótulo. - Gráficos com `seriesBy`: `{ \"series\": [...], \"labels\": [...], \"data\": [[{ \"x\": rótulo, \"y\": valor }]] }`, uma lista por série.
         * @summary Obter o resultado do widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getWidgetContent(dashboard: string, widget: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetWidgetContent200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getWidgetContent(dashboard, widget, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.getWidgetContent']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Obter o filtro do widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getWidgetRuleset(dashboard: string, widget: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetWidgetRuleset200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getWidgetRuleset(dashboard, widget, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.getWidgetRuleset']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Devolve os dashboards que o usuário da credencial vê. Lista simples, sem paginação.
         * @summary Listar dashboards
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listDashboards(options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<Dashboard>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listDashboards(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.listDashboards']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Filtros prontos que quem abre o dashboard pode aplicar. Lista simples, sem paginação.
         * @summary Listar predefinições de filtro
         * @param {string} dashboard ID do dashboard.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listFilterPresets(dashboard: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<FilterPreset>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listFilterPresets(dashboard, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.listFilterPresets']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Devolve os registros que o widget contou, com as colunas de `reportfields`. Cada coluna vem com o `slug` do campo, trocando o ponto por sublinhado (`deal.amount` vira `deal_amount`).
         * @summary Listar os registros por trás do widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listWidgetResults(dashboard: string, widget: string, page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListWidgetResults200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listWidgetResults(dashboard, widget, page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.listWidgetResults']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Lista simples, sem paginação.
         * @summary Listar widgets do dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listWidgets(dashboard: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<Widget>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listWidgets(dashboard, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.listWidgets']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie `title` e os campos que mudam.
         * @summary Atualizar dashboard
         * @param {string} dashboard ID do dashboard.
         * @param {CreateDashboardRequest} createDashboardRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateDashboard(dashboard: string, createDashboardRequest: CreateDashboardRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Dashboard>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateDashboard(dashboard, createDashboardRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.updateDashboard']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Atualizar predefinição de filtro
         * @param {string} dashboard ID do dashboard.
         * @param {string} preset ID da predefinição.
         * @param {UpdateFilterPresetRequest} updateFilterPresetRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateFilterPreset(dashboard: string, preset: string, updateFilterPresetRequest: UpdateFilterPresetRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<FilterPreset>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateFilterPreset(dashboard, preset, updateFilterPresetRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.updateFilterPreset']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `dashboards.change-widget-position`
         * @summary Atualizar widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {WidgetInput} widgetInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateWidget(dashboard: string, widget: string, widgetInput: WidgetInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Widget>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateWidget(dashboard, widget, widgetInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.updateWidget']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Substitui `content.filter.ruleset` e descarta o resultado guardado, para o próximo cálculo já usar o filtro novo.
         * @summary Trocar o filtro do widget
         * @param {string} dashboard ID do dashboard.
         * @param {string} widget ID do widget.
         * @param {UpdateWidgetRulesetRequest} updateWidgetRulesetRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateWidgetRuleset(dashboard: string, widget: string, updateWidgetRulesetRequest: UpdateWidgetRulesetRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<UpdateWidgetRuleset200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateWidgetRuleset(dashboard, widget, updateWidgetRulesetRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['DashboardsApi.updateWidgetRuleset']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * DashboardsApi - factory interface
 */
export const DashboardsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = DashboardsApiFp(configuration)
    return {
        /**
         * O único campo obrigatório é `title`. Para a credencial ver o dashboard que criou, use `forModel: Staff` com o ID do usuário dela em `staffs`.  **Permissão do Service Account:** `dashboards.create`
         * @summary Criar dashboard
         * @param {DashboardsApiCreateDashboardRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createDashboard(requestParameters: DashboardsApiCreateDashboardRequest, options?: RawAxiosRequestConfig): AxiosPromise<Dashboard> {
            return localVarFp.createDashboard(requestParameters.createDashboardRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * O nome não pode repetir no mesmo dashboard (`409`).
         * @summary Criar predefinição de filtro
         * @param {DashboardsApiCreateFilterPresetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createFilterPreset(requestParameters: DashboardsApiCreateFilterPresetRequest, options?: RawAxiosRequestConfig): AxiosPromise<FilterPreset> {
            return localVarFp.createFilterPreset(requestParameters.dashboard, requestParameters.createFilterPresetRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Obrigatórios: `title`, `displayAs`, `content.datasource`, `sizeX`, `sizeY`, `row` e `col`.  As regras de `content.filter.ruleset` não são validadas na gravação: um operador ou campo inexistente é aceito e o widget passa a devolver resultado vazio. Confira os nomes em `GET /api/resource-keywords`.  **Permissão do Service Account:** `dashboards.create-widget`
         * @summary Criar widget
         * @param {DashboardsApiCreateWidgetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createWidget(requestParameters: DashboardsApiCreateWidgetRequest, options?: RawAxiosRequestConfig): AxiosPromise<Widget> {
            return localVarFp.createWidget(requestParameters.dashboard, requestParameters.createWidgetRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Exclui o dashboard e os widgets dele. Não há como desfazer.  **Permissão do Service Account:** `dashboards.delete`
         * @summary Excluir dashboard
         * @param {DashboardsApiDeleteDashboardRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteDashboard(requestParameters: DashboardsApiDeleteDashboardRequest, options?: RawAxiosRequestConfig): AxiosPromise<DeleteDashboard200Response> {
            return localVarFp.deleteDashboard(requestParameters.dashboard, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Excluir predefinição de filtro
         * @param {DashboardsApiDeleteFilterPresetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteFilterPreset(requestParameters: DashboardsApiDeleteFilterPresetRequest, options?: RawAxiosRequestConfig): AxiosPromise<DeleteDashboard200Response> {
            return localVarFp.deleteFilterPreset(requestParameters.dashboard, requestParameters.preset, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `dashboards.delete-widget`
         * @summary Excluir widget
         * @param {DashboardsApiDeleteWidgetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteWidget(requestParameters: DashboardsApiDeleteWidgetRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.deleteWidget(requestParameters.dashboard, requestParameters.widget, options).then((request) => request(axios, basePath));
        },
        /**
         * Cria uma cópia com os mesmos widgets. A cópia recebe o título \"Cópia de …\"; o `title` do corpo é obrigatório, mas não é usado.
         * @summary Duplicar dashboard
         * @param {DashboardsApiDuplicateDashboardRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        duplicateDashboard(requestParameters: DashboardsApiDuplicateDashboardRequest, options?: RawAxiosRequestConfig): AxiosPromise<Dashboard> {
            return localVarFp.duplicateDashboard(requestParameters.dashboard, requestParameters.duplicateDashboardRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Obter dashboard
         * @param {DashboardsApiGetDashboardRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDashboard(requestParameters: DashboardsApiGetDashboardRequest, options?: RawAxiosRequestConfig): AxiosPromise<Dashboard> {
            return localVarFp.getDashboard(requestParameters.dashboard, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Obter widget
         * @param {DashboardsApiGetWidgetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWidget(requestParameters: DashboardsApiGetWidgetRequest, options?: RawAxiosRequestConfig): AxiosPromise<Widget> {
            return localVarFp.getWidget(requestParameters.dashboard, requestParameters.widget, options).then((request) => request(axios, basePath));
        },
        /**
         * O formato depende de `displayAs`:  - `NUMBER`: `{ \"value\": 12 }`. - `PERCENTAGE`: `{ \"value\": 3, \"total\": 1, \"percentage\": 300 }`, em que `percentage` é `value ÷ total × 100`. - Gráficos: `{ \"labels\": [...], \"data\": [...] }`, um valor por rótulo. - Gráficos com `seriesBy`: `{ \"series\": [...], \"labels\": [...], \"data\": [[{ \"x\": rótulo, \"y\": valor }]] }`, uma lista por série.
         * @summary Obter o resultado do widget
         * @param {DashboardsApiGetWidgetContentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWidgetContent(requestParameters: DashboardsApiGetWidgetContentRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetWidgetContent200Response> {
            return localVarFp.getWidgetContent(requestParameters.dashboard, requestParameters.widget, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Obter o filtro do widget
         * @param {DashboardsApiGetWidgetRulesetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWidgetRuleset(requestParameters: DashboardsApiGetWidgetRulesetRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetWidgetRuleset200Response> {
            return localVarFp.getWidgetRuleset(requestParameters.dashboard, requestParameters.widget, options).then((request) => request(axios, basePath));
        },
        /**
         * Devolve os dashboards que o usuário da credencial vê. Lista simples, sem paginação.
         * @summary Listar dashboards
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listDashboards(options?: RawAxiosRequestConfig): AxiosPromise<Array<Dashboard>> {
            return localVarFp.listDashboards(options).then((request) => request(axios, basePath));
        },
        /**
         * Filtros prontos que quem abre o dashboard pode aplicar. Lista simples, sem paginação.
         * @summary Listar predefinições de filtro
         * @param {DashboardsApiListFilterPresetsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listFilterPresets(requestParameters: DashboardsApiListFilterPresetsRequest, options?: RawAxiosRequestConfig): AxiosPromise<Array<FilterPreset>> {
            return localVarFp.listFilterPresets(requestParameters.dashboard, options).then((request) => request(axios, basePath));
        },
        /**
         * Devolve os registros que o widget contou, com as colunas de `reportfields`. Cada coluna vem com o `slug` do campo, trocando o ponto por sublinhado (`deal.amount` vira `deal_amount`).
         * @summary Listar os registros por trás do widget
         * @param {DashboardsApiListWidgetResultsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWidgetResults(requestParameters: DashboardsApiListWidgetResultsRequest, options?: RawAxiosRequestConfig): AxiosPromise<ListWidgetResults200Response> {
            return localVarFp.listWidgetResults(requestParameters.dashboard, requestParameters.widget, requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Lista simples, sem paginação.
         * @summary Listar widgets do dashboard
         * @param {DashboardsApiListWidgetsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWidgets(requestParameters: DashboardsApiListWidgetsRequest, options?: RawAxiosRequestConfig): AxiosPromise<Array<Widget>> {
            return localVarFp.listWidgets(requestParameters.dashboard, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie `title` e os campos que mudam.
         * @summary Atualizar dashboard
         * @param {DashboardsApiUpdateDashboardRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateDashboard(requestParameters: DashboardsApiUpdateDashboardRequest, options?: RawAxiosRequestConfig): AxiosPromise<Dashboard> {
            return localVarFp.updateDashboard(requestParameters.dashboard, requestParameters.createDashboardRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Atualizar predefinição de filtro
         * @param {DashboardsApiUpdateFilterPresetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateFilterPreset(requestParameters: DashboardsApiUpdateFilterPresetRequest, options?: RawAxiosRequestConfig): AxiosPromise<FilterPreset> {
            return localVarFp.updateFilterPreset(requestParameters.dashboard, requestParameters.preset, requestParameters.updateFilterPresetRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só os campos que mudam.  **Permissão do Service Account:** `dashboards.change-widget-position`
         * @summary Atualizar widget
         * @param {DashboardsApiUpdateWidgetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateWidget(requestParameters: DashboardsApiUpdateWidgetRequest, options?: RawAxiosRequestConfig): AxiosPromise<Widget> {
            return localVarFp.updateWidget(requestParameters.dashboard, requestParameters.widget, requestParameters.widgetInput, options).then((request) => request(axios, basePath));
        },
        /**
         * Substitui `content.filter.ruleset` e descarta o resultado guardado, para o próximo cálculo já usar o filtro novo.
         * @summary Trocar o filtro do widget
         * @param {DashboardsApiUpdateWidgetRulesetRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateWidgetRuleset(requestParameters: DashboardsApiUpdateWidgetRulesetRequest, options?: RawAxiosRequestConfig): AxiosPromise<UpdateWidgetRuleset200Response> {
            return localVarFp.updateWidgetRuleset(requestParameters.dashboard, requestParameters.widget, requestParameters.updateWidgetRulesetRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createDashboard operation in DashboardsApi.
 */
export interface DashboardsApiCreateDashboardRequest {
    readonly createDashboardRequest: CreateDashboardRequest
}

/**
 * Request parameters for createFilterPreset operation in DashboardsApi.
 */
export interface DashboardsApiCreateFilterPresetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    readonly createFilterPresetRequest: CreateFilterPresetRequest
}

/**
 * Request parameters for createWidget operation in DashboardsApi.
 */
export interface DashboardsApiCreateWidgetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    readonly createWidgetRequest: CreateWidgetRequest
}

/**
 * Request parameters for deleteDashboard operation in DashboardsApi.
 */
export interface DashboardsApiDeleteDashboardRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string
}

/**
 * Request parameters for deleteFilterPreset operation in DashboardsApi.
 */
export interface DashboardsApiDeleteFilterPresetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID da predefinição.
     */
    readonly preset: string
}

/**
 * Request parameters for deleteWidget operation in DashboardsApi.
 */
export interface DashboardsApiDeleteWidgetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID do widget.
     */
    readonly widget: string
}

/**
 * Request parameters for duplicateDashboard operation in DashboardsApi.
 */
export interface DashboardsApiDuplicateDashboardRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    readonly duplicateDashboardRequest: DuplicateDashboardRequest
}

/**
 * Request parameters for getDashboard operation in DashboardsApi.
 */
export interface DashboardsApiGetDashboardRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string
}

/**
 * Request parameters for getWidget operation in DashboardsApi.
 */
export interface DashboardsApiGetWidgetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID do widget.
     */
    readonly widget: string
}

/**
 * Request parameters for getWidgetContent operation in DashboardsApi.
 */
export interface DashboardsApiGetWidgetContentRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID do widget.
     */
    readonly widget: string
}

/**
 * Request parameters for getWidgetRuleset operation in DashboardsApi.
 */
export interface DashboardsApiGetWidgetRulesetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID do widget.
     */
    readonly widget: string
}

/**
 * Request parameters for listFilterPresets operation in DashboardsApi.
 */
export interface DashboardsApiListFilterPresetsRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string
}

/**
 * Request parameters for listWidgetResults operation in DashboardsApi.
 */
export interface DashboardsApiListWidgetResultsRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID do widget.
     */
    readonly widget: string

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
 * Request parameters for listWidgets operation in DashboardsApi.
 */
export interface DashboardsApiListWidgetsRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string
}

/**
 * Request parameters for updateDashboard operation in DashboardsApi.
 */
export interface DashboardsApiUpdateDashboardRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    readonly createDashboardRequest: CreateDashboardRequest
}

/**
 * Request parameters for updateFilterPreset operation in DashboardsApi.
 */
export interface DashboardsApiUpdateFilterPresetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID da predefinição.
     */
    readonly preset: string

    readonly updateFilterPresetRequest: UpdateFilterPresetRequest
}

/**
 * Request parameters for updateWidget operation in DashboardsApi.
 */
export interface DashboardsApiUpdateWidgetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID do widget.
     */
    readonly widget: string

    readonly widgetInput: WidgetInput
}

/**
 * Request parameters for updateWidgetRuleset operation in DashboardsApi.
 */
export interface DashboardsApiUpdateWidgetRulesetRequest {
    /**
     * ID do dashboard.
     */
    readonly dashboard: string

    /**
     * ID do widget.
     */
    readonly widget: string

    readonly updateWidgetRulesetRequest: UpdateWidgetRulesetRequest
}

/**
 * DashboardsApi - object-oriented interface
 */
export class DashboardsApi extends BaseAPI {
    /**
     * O único campo obrigatório é `title`. Para a credencial ver o dashboard que criou, use `forModel: Staff` com o ID do usuário dela em `staffs`.  **Permissão do Service Account:** `dashboards.create`
     * @summary Criar dashboard
     * @param {DashboardsApiCreateDashboardRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createDashboard(requestParameters: DashboardsApiCreateDashboardRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).createDashboard(requestParameters.createDashboardRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * O nome não pode repetir no mesmo dashboard (`409`).
     * @summary Criar predefinição de filtro
     * @param {DashboardsApiCreateFilterPresetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createFilterPreset(requestParameters: DashboardsApiCreateFilterPresetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).createFilterPreset(requestParameters.dashboard, requestParameters.createFilterPresetRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Obrigatórios: `title`, `displayAs`, `content.datasource`, `sizeX`, `sizeY`, `row` e `col`.  As regras de `content.filter.ruleset` não são validadas na gravação: um operador ou campo inexistente é aceito e o widget passa a devolver resultado vazio. Confira os nomes em `GET /api/resource-keywords`.  **Permissão do Service Account:** `dashboards.create-widget`
     * @summary Criar widget
     * @param {DashboardsApiCreateWidgetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createWidget(requestParameters: DashboardsApiCreateWidgetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).createWidget(requestParameters.dashboard, requestParameters.createWidgetRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Exclui o dashboard e os widgets dele. Não há como desfazer.  **Permissão do Service Account:** `dashboards.delete`
     * @summary Excluir dashboard
     * @param {DashboardsApiDeleteDashboardRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteDashboard(requestParameters: DashboardsApiDeleteDashboardRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).deleteDashboard(requestParameters.dashboard, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Excluir predefinição de filtro
     * @param {DashboardsApiDeleteFilterPresetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteFilterPreset(requestParameters: DashboardsApiDeleteFilterPresetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).deleteFilterPreset(requestParameters.dashboard, requestParameters.preset, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `dashboards.delete-widget`
     * @summary Excluir widget
     * @param {DashboardsApiDeleteWidgetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteWidget(requestParameters: DashboardsApiDeleteWidgetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).deleteWidget(requestParameters.dashboard, requestParameters.widget, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Cria uma cópia com os mesmos widgets. A cópia recebe o título \"Cópia de …\"; o `title` do corpo é obrigatório, mas não é usado.
     * @summary Duplicar dashboard
     * @param {DashboardsApiDuplicateDashboardRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public duplicateDashboard(requestParameters: DashboardsApiDuplicateDashboardRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).duplicateDashboard(requestParameters.dashboard, requestParameters.duplicateDashboardRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Obter dashboard
     * @param {DashboardsApiGetDashboardRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getDashboard(requestParameters: DashboardsApiGetDashboardRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).getDashboard(requestParameters.dashboard, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Obter widget
     * @param {DashboardsApiGetWidgetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getWidget(requestParameters: DashboardsApiGetWidgetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).getWidget(requestParameters.dashboard, requestParameters.widget, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * O formato depende de `displayAs`:  - `NUMBER`: `{ \"value\": 12 }`. - `PERCENTAGE`: `{ \"value\": 3, \"total\": 1, \"percentage\": 300 }`, em que `percentage` é `value ÷ total × 100`. - Gráficos: `{ \"labels\": [...], \"data\": [...] }`, um valor por rótulo. - Gráficos com `seriesBy`: `{ \"series\": [...], \"labels\": [...], \"data\": [[{ \"x\": rótulo, \"y\": valor }]] }`, uma lista por série.
     * @summary Obter o resultado do widget
     * @param {DashboardsApiGetWidgetContentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getWidgetContent(requestParameters: DashboardsApiGetWidgetContentRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).getWidgetContent(requestParameters.dashboard, requestParameters.widget, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Obter o filtro do widget
     * @param {DashboardsApiGetWidgetRulesetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getWidgetRuleset(requestParameters: DashboardsApiGetWidgetRulesetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).getWidgetRuleset(requestParameters.dashboard, requestParameters.widget, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Devolve os dashboards que o usuário da credencial vê. Lista simples, sem paginação.
     * @summary Listar dashboards
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listDashboards(options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).listDashboards(options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Filtros prontos que quem abre o dashboard pode aplicar. Lista simples, sem paginação.
     * @summary Listar predefinições de filtro
     * @param {DashboardsApiListFilterPresetsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listFilterPresets(requestParameters: DashboardsApiListFilterPresetsRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).listFilterPresets(requestParameters.dashboard, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Devolve os registros que o widget contou, com as colunas de `reportfields`. Cada coluna vem com o `slug` do campo, trocando o ponto por sublinhado (`deal.amount` vira `deal_amount`).
     * @summary Listar os registros por trás do widget
     * @param {DashboardsApiListWidgetResultsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listWidgetResults(requestParameters: DashboardsApiListWidgetResultsRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).listWidgetResults(requestParameters.dashboard, requestParameters.widget, requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Lista simples, sem paginação.
     * @summary Listar widgets do dashboard
     * @param {DashboardsApiListWidgetsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listWidgets(requestParameters: DashboardsApiListWidgetsRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).listWidgets(requestParameters.dashboard, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie `title` e os campos que mudam.
     * @summary Atualizar dashboard
     * @param {DashboardsApiUpdateDashboardRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateDashboard(requestParameters: DashboardsApiUpdateDashboardRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).updateDashboard(requestParameters.dashboard, requestParameters.createDashboardRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Atualizar predefinição de filtro
     * @param {DashboardsApiUpdateFilterPresetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateFilterPreset(requestParameters: DashboardsApiUpdateFilterPresetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).updateFilterPreset(requestParameters.dashboard, requestParameters.preset, requestParameters.updateFilterPresetRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só os campos que mudam.  **Permissão do Service Account:** `dashboards.change-widget-position`
     * @summary Atualizar widget
     * @param {DashboardsApiUpdateWidgetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateWidget(requestParameters: DashboardsApiUpdateWidgetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).updateWidget(requestParameters.dashboard, requestParameters.widget, requestParameters.widgetInput, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Substitui `content.filter.ruleset` e descarta o resultado guardado, para o próximo cálculo já usar o filtro novo.
     * @summary Trocar o filtro do widget
     * @param {DashboardsApiUpdateWidgetRulesetRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateWidgetRuleset(requestParameters: DashboardsApiUpdateWidgetRulesetRequest, options?: RawAxiosRequestConfig) {
        return DashboardsApiFp(this.configuration).updateWidgetRuleset(requestParameters.dashboard, requestParameters.widget, requestParameters.updateWidgetRulesetRequest, options).then((request) => request(this.axios, this.basePath));
    }
}


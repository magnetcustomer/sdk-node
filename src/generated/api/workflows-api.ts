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
import type { CheckContactInWorkflow200Response } from '../models';
// @ts-ignore
import type { CreateWorkflowRequest } from '../models';
// @ts-ignore
import type { EnrollContactInWorkflow201Response } from '../models';
// @ts-ignore
import type { EnrollContactInWorkflowRequest } from '../models';
// @ts-ignore
import type { GetWorkflowResults200Response } from '../models';
// @ts-ignore
import type { ListContactEnrollments200Response } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListWorkflowExecutions200Response } from '../models';
// @ts-ignore
import type { ListWorkflows200Response } from '../models';
// @ts-ignore
import type { PauseWorkflowRequest } from '../models';
// @ts-ignore
import type { PublishWorkflowRequest } from '../models';
// @ts-ignore
import type { UpdateWorkflow200Response } from '../models';
// @ts-ignore
import type { UpdateWorkflowRequest } from '../models';
// @ts-ignore
import type { ValidateWorkflow200Response } from '../models';
// @ts-ignore
import type { ValidateWorkflowRequest } from '../models';
// @ts-ignore
import type { Workflow } from '../models';
/**
 * WorkflowsApi - axios parameter creator
 */
export const WorkflowsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * O workflow passa a `archived` e sai das listagens. Quem estava nele para de avançar.  **Permissão do Service Account:** `workflows.publish`
         * @summary Arquivar workflow
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        archiveWorkflow: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('archiveWorkflow', 'id', id)
            const localVarPath = `/api/workflows/{id}`
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
         * Explica, para um contato, se ele entra no workflow publicado e por quê. Responde `409` se o workflow não tem versão publicada.  **Permissão do Service Account:** `workflows.list`
         * @summary Verificar se um contato entraria no workflow
         * @param {string} id ID do registro.
         * @param {EnrollContactInWorkflowRequest} enrollContactInWorkflowRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        checkContactInWorkflow: async (id: string, enrollContactInWorkflowRequest: EnrollContactInWorkflowRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('checkContactInWorkflow', 'id', id)
            // verify required parameter 'enrollContactInWorkflowRequest' is not null or undefined
            assertParamExists('checkContactInWorkflow', 'enrollContactInWorkflowRequest', enrollContactInWorkflowRequest)
            const localVarPath = `/api/workflows/{id}/check-contact`
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
            localVarRequestOptions.data = serializeDataIfNeeded(enrollContactInWorkflowRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Cria o workflow em rascunho. Só `name` e `description` são aceitos aqui; um campo a mais devolve `400`. O rascunho nasce com um gatilho de segmento de exemplo: defina os seus passos em seguida, pela atualização.  **Permissão do Service Account:** `workflows.edit`
         * @summary Criar workflow
         * @param {CreateWorkflowRequest} createWorkflowRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createWorkflow: async (createWorkflowRequest: CreateWorkflowRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createWorkflowRequest' is not null or undefined
            assertParamExists('createWorkflow', 'createWorkflowRequest', createWorkflowRequest)
            const localVarPath = `/api/workflows`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createWorkflowRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Coloca o contato no início de um workflow publicado que tenha o gatilho de entrada manual (`manual_trigger`). Responde `409` se o workflow não estiver aceitando entradas (rascunho, pausado ou arquivado).  **Permissão do Service Account:** `workflows.manage-enrollments`
         * @summary Inscrever um contato no workflow
         * @param {string} id ID do registro.
         * @param {EnrollContactInWorkflowRequest} enrollContactInWorkflowRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        enrollContactInWorkflow: async (id: string, enrollContactInWorkflowRequest: EnrollContactInWorkflowRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('enrollContactInWorkflow', 'id', id)
            // verify required parameter 'enrollContactInWorkflowRequest' is not null or undefined
            assertParamExists('enrollContactInWorkflow', 'enrollContactInWorkflowRequest', enrollContactInWorkflowRequest)
            const localVarPath = `/api/workflows/{id}/enrollments`
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
            localVarRequestOptions.data = serializeDataIfNeeded(enrollContactInWorkflowRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * **Permissão do Service Account:** `workflows.list`
         * @summary Obter workflow
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWorkflow: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getWorkflow', 'id', id)
            const localVarPath = `/api/workflows/{id}`
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
         * Totais do período (padrão: últimos 30 dias) e números por passo e por e-mail.  **Permissão do Service Account:** `workflows.list`
         * @summary Obter os resultados do workflow
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWorkflowResults: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getWorkflowResults', 'id', id)
            const localVarPath = `/api/workflows/{id}/results`
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
         * Em quais workflows o contato está ou esteve, e em que passo.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar os workflows de um contato
         * @param {string} contact ID do contato. Obrigatório.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listContactEnrollments: async (contact: string, page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'contact' is not null or undefined
            assertParamExists('listContactEnrollments', 'contact', contact)
            const localVarPath = `/api/workflows/enrollments`;
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

            if (contact !== undefined) {
                localVarQueryParameter['contact'] = contact;
            }

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
         * Quem entrou, por onde passou e como terminou.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar execuções do workflow
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWorkflowExecutions: async (id: string, page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('listWorkflowExecutions', 'id', id)
            const localVarPath = `/api/workflows/{id}/executions`
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
         * Ordenação padrão: `updatedAt` decrescente. Tamanho de página padrão: 25. A listagem não traz o desenho; use a operação de obter.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar workflows
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [search] Busca no nome.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWorkflows: async (page?: number, limit?: number, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/workflows`;
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
         * `new_entries` barra só novas entradas; `all` também segura quem já está no meio do caminho.  **Permissão do Service Account:** `workflows.publish`
         * @summary Pausar workflow
         * @param {string} id ID do registro.
         * @param {PauseWorkflowRequest} [pauseWorkflowRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        pauseWorkflow: async (id: string, pauseWorkflowRequest?: PauseWorkflowRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('pauseWorkflow', 'id', id)
            const localVarPath = `/api/workflows/{id}/pause`
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
            localVarRequestOptions.data = serializeDataIfNeeded(pauseWorkflowRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Torna o rascunho a versão em execução e muda a situação para `active`. **A partir daqui o workflow age sobre contatos reais**: um gatilho de segmento passa a rodar na agenda; os de formulário e de evento, a cada ocorrência. Valide antes.  A resposta vem em um envelope: `{ \"workflow\": {...} }`.  **Permissão do Service Account:** `workflows.publish`
         * @summary Publicar workflow
         * @param {string} id ID do registro.
         * @param {PublishWorkflowRequest} [publishWorkflowRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        publishWorkflow: async (id: string, publishWorkflowRequest?: PublishWorkflowRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('publishWorkflow', 'id', id)
            const localVarPath = `/api/workflows/{id}/publish`
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
            localVarRequestOptions.data = serializeDataIfNeeded(publishWorkflowRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Volta a situação para `active`. Sem corpo.  **Permissão do Service Account:** `workflows.publish`
         * @summary Retomar workflow
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        resumeWorkflow: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('resumeWorkflow', 'id', id)
            const localVarPath = `/api/workflows/{id}/resume`
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
         * Envie só o que muda. `draftGraph` substitui o desenho inteiro. A alteração fica no rascunho: quem já está no workflow segue na versão publicada até uma nova publicação.  A resposta vem em um envelope: `{ \"workflow\": {...} }`.  **Permissão do Service Account:** `workflows.edit`
         * @summary Atualizar o rascunho do workflow
         * @param {string} id ID do registro.
         * @param {UpdateWorkflowRequest} updateWorkflowRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateWorkflow: async (id: string, updateWorkflowRequest: UpdateWorkflowRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateWorkflow', 'id', id)
            // verify required parameter 'updateWorkflowRequest' is not null or undefined
            assertParamExists('updateWorkflow', 'updateWorkflowRequest', updateWorkflowRequest)
            const localVarPath = `/api/workflows/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateWorkflowRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Confere o rascunho gravado, ou o `draftGraph` enviado, e devolve os problemas por passo. Com `forPublish: true`, aplica também as exigências da publicação. Lista vazia em `issues` significa pronto para publicar.  **Permissão do Service Account:** `workflows.edit`
         * @summary Validar o desenho do workflow
         * @param {string} id ID do registro.
         * @param {ValidateWorkflowRequest} [validateWorkflowRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        validateWorkflow: async (id: string, validateWorkflowRequest?: ValidateWorkflowRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('validateWorkflow', 'id', id)
            const localVarPath = `/api/workflows/{id}/validate`
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
            localVarRequestOptions.data = serializeDataIfNeeded(validateWorkflowRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * WorkflowsApi - functional programming interface
 */
export const WorkflowsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = WorkflowsApiAxiosParamCreator(configuration)
    return {
        /**
         * O workflow passa a `archived` e sai das listagens. Quem estava nele para de avançar.  **Permissão do Service Account:** `workflows.publish`
         * @summary Arquivar workflow
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async archiveWorkflow(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Workflow>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.archiveWorkflow(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.archiveWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Explica, para um contato, se ele entra no workflow publicado e por quê. Responde `409` se o workflow não tem versão publicada.  **Permissão do Service Account:** `workflows.list`
         * @summary Verificar se um contato entraria no workflow
         * @param {string} id ID do registro.
         * @param {EnrollContactInWorkflowRequest} enrollContactInWorkflowRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async checkContactInWorkflow(id: string, enrollContactInWorkflowRequest: EnrollContactInWorkflowRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<CheckContactInWorkflow200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.checkContactInWorkflow(id, enrollContactInWorkflowRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.checkContactInWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Cria o workflow em rascunho. Só `name` e `description` são aceitos aqui; um campo a mais devolve `400`. O rascunho nasce com um gatilho de segmento de exemplo: defina os seus passos em seguida, pela atualização.  **Permissão do Service Account:** `workflows.edit`
         * @summary Criar workflow
         * @param {CreateWorkflowRequest} createWorkflowRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createWorkflow(createWorkflowRequest: CreateWorkflowRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Workflow>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createWorkflow(createWorkflowRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.createWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Coloca o contato no início de um workflow publicado que tenha o gatilho de entrada manual (`manual_trigger`). Responde `409` se o workflow não estiver aceitando entradas (rascunho, pausado ou arquivado).  **Permissão do Service Account:** `workflows.manage-enrollments`
         * @summary Inscrever um contato no workflow
         * @param {string} id ID do registro.
         * @param {EnrollContactInWorkflowRequest} enrollContactInWorkflowRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async enrollContactInWorkflow(id: string, enrollContactInWorkflowRequest: EnrollContactInWorkflowRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<EnrollContactInWorkflow201Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.enrollContactInWorkflow(id, enrollContactInWorkflowRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.enrollContactInWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `workflows.list`
         * @summary Obter workflow
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getWorkflow(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Workflow>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getWorkflow(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.getWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Totais do período (padrão: últimos 30 dias) e números por passo e por e-mail.  **Permissão do Service Account:** `workflows.list`
         * @summary Obter os resultados do workflow
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getWorkflowResults(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetWorkflowResults200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getWorkflowResults(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.getWorkflowResults']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Em quais workflows o contato está ou esteve, e em que passo.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar os workflows de um contato
         * @param {string} contact ID do contato. Obrigatório.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listContactEnrollments(contact: string, page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListContactEnrollments200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listContactEnrollments(contact, page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.listContactEnrollments']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Quem entrou, por onde passou e como terminou.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar execuções do workflow
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listWorkflowExecutions(id: string, page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListWorkflowExecutions200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listWorkflowExecutions(id, page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.listWorkflowExecutions']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `updatedAt` decrescente. Tamanho de página padrão: 25. A listagem não traz o desenho; use a operação de obter.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar workflows
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [search] Busca no nome.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listWorkflows(page?: number, limit?: number, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListWorkflows200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listWorkflows(page, limit, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.listWorkflows']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * `new_entries` barra só novas entradas; `all` também segura quem já está no meio do caminho.  **Permissão do Service Account:** `workflows.publish`
         * @summary Pausar workflow
         * @param {string} id ID do registro.
         * @param {PauseWorkflowRequest} [pauseWorkflowRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async pauseWorkflow(id: string, pauseWorkflowRequest?: PauseWorkflowRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Workflow>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.pauseWorkflow(id, pauseWorkflowRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.pauseWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Torna o rascunho a versão em execução e muda a situação para `active`. **A partir daqui o workflow age sobre contatos reais**: um gatilho de segmento passa a rodar na agenda; os de formulário e de evento, a cada ocorrência. Valide antes.  A resposta vem em um envelope: `{ \"workflow\": {...} }`.  **Permissão do Service Account:** `workflows.publish`
         * @summary Publicar workflow
         * @param {string} id ID do registro.
         * @param {PublishWorkflowRequest} [publishWorkflowRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async publishWorkflow(id: string, publishWorkflowRequest?: PublishWorkflowRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<UpdateWorkflow200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.publishWorkflow(id, publishWorkflowRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.publishWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Volta a situação para `active`. Sem corpo.  **Permissão do Service Account:** `workflows.publish`
         * @summary Retomar workflow
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async resumeWorkflow(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Workflow>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.resumeWorkflow(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.resumeWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só o que muda. `draftGraph` substitui o desenho inteiro. A alteração fica no rascunho: quem já está no workflow segue na versão publicada até uma nova publicação.  A resposta vem em um envelope: `{ \"workflow\": {...} }`.  **Permissão do Service Account:** `workflows.edit`
         * @summary Atualizar o rascunho do workflow
         * @param {string} id ID do registro.
         * @param {UpdateWorkflowRequest} updateWorkflowRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateWorkflow(id: string, updateWorkflowRequest: UpdateWorkflowRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<UpdateWorkflow200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateWorkflow(id, updateWorkflowRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.updateWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Confere o rascunho gravado, ou o `draftGraph` enviado, e devolve os problemas por passo. Com `forPublish: true`, aplica também as exigências da publicação. Lista vazia em `issues` significa pronto para publicar.  **Permissão do Service Account:** `workflows.edit`
         * @summary Validar o desenho do workflow
         * @param {string} id ID do registro.
         * @param {ValidateWorkflowRequest} [validateWorkflowRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async validateWorkflow(id: string, validateWorkflowRequest?: ValidateWorkflowRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ValidateWorkflow200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.validateWorkflow(id, validateWorkflowRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['WorkflowsApi.validateWorkflow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * WorkflowsApi - factory interface
 */
export const WorkflowsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = WorkflowsApiFp(configuration)
    return {
        /**
         * O workflow passa a `archived` e sai das listagens. Quem estava nele para de avançar.  **Permissão do Service Account:** `workflows.publish`
         * @summary Arquivar workflow
         * @param {WorkflowsApiArchiveWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        archiveWorkflow(requestParameters: WorkflowsApiArchiveWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<Workflow> {
            return localVarFp.archiveWorkflow(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Explica, para um contato, se ele entra no workflow publicado e por quê. Responde `409` se o workflow não tem versão publicada.  **Permissão do Service Account:** `workflows.list`
         * @summary Verificar se um contato entraria no workflow
         * @param {WorkflowsApiCheckContactInWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        checkContactInWorkflow(requestParameters: WorkflowsApiCheckContactInWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<CheckContactInWorkflow200Response> {
            return localVarFp.checkContactInWorkflow(requestParameters.id, requestParameters.enrollContactInWorkflowRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Cria o workflow em rascunho. Só `name` e `description` são aceitos aqui; um campo a mais devolve `400`. O rascunho nasce com um gatilho de segmento de exemplo: defina os seus passos em seguida, pela atualização.  **Permissão do Service Account:** `workflows.edit`
         * @summary Criar workflow
         * @param {WorkflowsApiCreateWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createWorkflow(requestParameters: WorkflowsApiCreateWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<Workflow> {
            return localVarFp.createWorkflow(requestParameters.createWorkflowRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Coloca o contato no início de um workflow publicado que tenha o gatilho de entrada manual (`manual_trigger`). Responde `409` se o workflow não estiver aceitando entradas (rascunho, pausado ou arquivado).  **Permissão do Service Account:** `workflows.manage-enrollments`
         * @summary Inscrever um contato no workflow
         * @param {WorkflowsApiEnrollContactInWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        enrollContactInWorkflow(requestParameters: WorkflowsApiEnrollContactInWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<EnrollContactInWorkflow201Response> {
            return localVarFp.enrollContactInWorkflow(requestParameters.id, requestParameters.enrollContactInWorkflowRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `workflows.list`
         * @summary Obter workflow
         * @param {WorkflowsApiGetWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWorkflow(requestParameters: WorkflowsApiGetWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<Workflow> {
            return localVarFp.getWorkflow(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Totais do período (padrão: últimos 30 dias) e números por passo e por e-mail.  **Permissão do Service Account:** `workflows.list`
         * @summary Obter os resultados do workflow
         * @param {WorkflowsApiGetWorkflowResultsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWorkflowResults(requestParameters: WorkflowsApiGetWorkflowResultsRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetWorkflowResults200Response> {
            return localVarFp.getWorkflowResults(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Em quais workflows o contato está ou esteve, e em que passo.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar os workflows de um contato
         * @param {WorkflowsApiListContactEnrollmentsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listContactEnrollments(requestParameters: WorkflowsApiListContactEnrollmentsRequest, options?: RawAxiosRequestConfig): AxiosPromise<ListContactEnrollments200Response> {
            return localVarFp.listContactEnrollments(requestParameters.contact, requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Quem entrou, por onde passou e como terminou.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar execuções do workflow
         * @param {WorkflowsApiListWorkflowExecutionsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWorkflowExecutions(requestParameters: WorkflowsApiListWorkflowExecutionsRequest, options?: RawAxiosRequestConfig): AxiosPromise<ListWorkflowExecutions200Response> {
            return localVarFp.listWorkflowExecutions(requestParameters.id, requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `updatedAt` decrescente. Tamanho de página padrão: 25. A listagem não traz o desenho; use a operação de obter.  **Permissão do Service Account:** `workflows.list`
         * @summary Listar workflows
         * @param {WorkflowsApiListWorkflowsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWorkflows(requestParameters: WorkflowsApiListWorkflowsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListWorkflows200Response> {
            return localVarFp.listWorkflows(requestParameters.page, requestParameters.limit, requestParameters.search, options).then((request) => request(axios, basePath));
        },
        /**
         * `new_entries` barra só novas entradas; `all` também segura quem já está no meio do caminho.  **Permissão do Service Account:** `workflows.publish`
         * @summary Pausar workflow
         * @param {WorkflowsApiPauseWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        pauseWorkflow(requestParameters: WorkflowsApiPauseWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<Workflow> {
            return localVarFp.pauseWorkflow(requestParameters.id, requestParameters.pauseWorkflowRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Torna o rascunho a versão em execução e muda a situação para `active`. **A partir daqui o workflow age sobre contatos reais**: um gatilho de segmento passa a rodar na agenda; os de formulário e de evento, a cada ocorrência. Valide antes.  A resposta vem em um envelope: `{ \"workflow\": {...} }`.  **Permissão do Service Account:** `workflows.publish`
         * @summary Publicar workflow
         * @param {WorkflowsApiPublishWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        publishWorkflow(requestParameters: WorkflowsApiPublishWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<UpdateWorkflow200Response> {
            return localVarFp.publishWorkflow(requestParameters.id, requestParameters.publishWorkflowRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Volta a situação para `active`. Sem corpo.  **Permissão do Service Account:** `workflows.publish`
         * @summary Retomar workflow
         * @param {WorkflowsApiResumeWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        resumeWorkflow(requestParameters: WorkflowsApiResumeWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<Workflow> {
            return localVarFp.resumeWorkflow(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só o que muda. `draftGraph` substitui o desenho inteiro. A alteração fica no rascunho: quem já está no workflow segue na versão publicada até uma nova publicação.  A resposta vem em um envelope: `{ \"workflow\": {...} }`.  **Permissão do Service Account:** `workflows.edit`
         * @summary Atualizar o rascunho do workflow
         * @param {WorkflowsApiUpdateWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateWorkflow(requestParameters: WorkflowsApiUpdateWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<UpdateWorkflow200Response> {
            return localVarFp.updateWorkflow(requestParameters.id, requestParameters.updateWorkflowRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Confere o rascunho gravado, ou o `draftGraph` enviado, e devolve os problemas por passo. Com `forPublish: true`, aplica também as exigências da publicação. Lista vazia em `issues` significa pronto para publicar.  **Permissão do Service Account:** `workflows.edit`
         * @summary Validar o desenho do workflow
         * @param {WorkflowsApiValidateWorkflowRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        validateWorkflow(requestParameters: WorkflowsApiValidateWorkflowRequest, options?: RawAxiosRequestConfig): AxiosPromise<ValidateWorkflow200Response> {
            return localVarFp.validateWorkflow(requestParameters.id, requestParameters.validateWorkflowRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for archiveWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiArchiveWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for checkContactInWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiCheckContactInWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly enrollContactInWorkflowRequest: EnrollContactInWorkflowRequest
}

/**
 * Request parameters for createWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiCreateWorkflowRequest {
    readonly createWorkflowRequest: CreateWorkflowRequest
}

/**
 * Request parameters for enrollContactInWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiEnrollContactInWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly enrollContactInWorkflowRequest: EnrollContactInWorkflowRequest
}

/**
 * Request parameters for getWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiGetWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getWorkflowResults operation in WorkflowsApi.
 */
export interface WorkflowsApiGetWorkflowResultsRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listContactEnrollments operation in WorkflowsApi.
 */
export interface WorkflowsApiListContactEnrollmentsRequest {
    /**
     * ID do contato. Obrigatório.
     */
    readonly contact: string

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
 * Request parameters for listWorkflowExecutions operation in WorkflowsApi.
 */
export interface WorkflowsApiListWorkflowExecutionsRequest {
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
 * Request parameters for listWorkflows operation in WorkflowsApi.
 */
export interface WorkflowsApiListWorkflowsRequest {
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
}

/**
 * Request parameters for pauseWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiPauseWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly pauseWorkflowRequest?: PauseWorkflowRequest
}

/**
 * Request parameters for publishWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiPublishWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly publishWorkflowRequest?: PublishWorkflowRequest
}

/**
 * Request parameters for resumeWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiResumeWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for updateWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiUpdateWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly updateWorkflowRequest: UpdateWorkflowRequest
}

/**
 * Request parameters for validateWorkflow operation in WorkflowsApi.
 */
export interface WorkflowsApiValidateWorkflowRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly validateWorkflowRequest?: ValidateWorkflowRequest
}

/**
 * WorkflowsApi - object-oriented interface
 */
export class WorkflowsApi extends BaseAPI {
    /**
     * O workflow passa a `archived` e sai das listagens. Quem estava nele para de avançar.  **Permissão do Service Account:** `workflows.publish`
     * @summary Arquivar workflow
     * @param {WorkflowsApiArchiveWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public archiveWorkflow(requestParameters: WorkflowsApiArchiveWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).archiveWorkflow(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Explica, para um contato, se ele entra no workflow publicado e por quê. Responde `409` se o workflow não tem versão publicada.  **Permissão do Service Account:** `workflows.list`
     * @summary Verificar se um contato entraria no workflow
     * @param {WorkflowsApiCheckContactInWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public checkContactInWorkflow(requestParameters: WorkflowsApiCheckContactInWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).checkContactInWorkflow(requestParameters.id, requestParameters.enrollContactInWorkflowRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Cria o workflow em rascunho. Só `name` e `description` são aceitos aqui; um campo a mais devolve `400`. O rascunho nasce com um gatilho de segmento de exemplo: defina os seus passos em seguida, pela atualização.  **Permissão do Service Account:** `workflows.edit`
     * @summary Criar workflow
     * @param {WorkflowsApiCreateWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createWorkflow(requestParameters: WorkflowsApiCreateWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).createWorkflow(requestParameters.createWorkflowRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Coloca o contato no início de um workflow publicado que tenha o gatilho de entrada manual (`manual_trigger`). Responde `409` se o workflow não estiver aceitando entradas (rascunho, pausado ou arquivado).  **Permissão do Service Account:** `workflows.manage-enrollments`
     * @summary Inscrever um contato no workflow
     * @param {WorkflowsApiEnrollContactInWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public enrollContactInWorkflow(requestParameters: WorkflowsApiEnrollContactInWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).enrollContactInWorkflow(requestParameters.id, requestParameters.enrollContactInWorkflowRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `workflows.list`
     * @summary Obter workflow
     * @param {WorkflowsApiGetWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getWorkflow(requestParameters: WorkflowsApiGetWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).getWorkflow(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Totais do período (padrão: últimos 30 dias) e números por passo e por e-mail.  **Permissão do Service Account:** `workflows.list`
     * @summary Obter os resultados do workflow
     * @param {WorkflowsApiGetWorkflowResultsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getWorkflowResults(requestParameters: WorkflowsApiGetWorkflowResultsRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).getWorkflowResults(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Em quais workflows o contato está ou esteve, e em que passo.  **Permissão do Service Account:** `workflows.list`
     * @summary Listar os workflows de um contato
     * @param {WorkflowsApiListContactEnrollmentsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listContactEnrollments(requestParameters: WorkflowsApiListContactEnrollmentsRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).listContactEnrollments(requestParameters.contact, requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Quem entrou, por onde passou e como terminou.  **Permissão do Service Account:** `workflows.list`
     * @summary Listar execuções do workflow
     * @param {WorkflowsApiListWorkflowExecutionsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listWorkflowExecutions(requestParameters: WorkflowsApiListWorkflowExecutionsRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).listWorkflowExecutions(requestParameters.id, requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `updatedAt` decrescente. Tamanho de página padrão: 25. A listagem não traz o desenho; use a operação de obter.  **Permissão do Service Account:** `workflows.list`
     * @summary Listar workflows
     * @param {WorkflowsApiListWorkflowsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listWorkflows(requestParameters: WorkflowsApiListWorkflowsRequest = {}, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).listWorkflows(requestParameters.page, requestParameters.limit, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * `new_entries` barra só novas entradas; `all` também segura quem já está no meio do caminho.  **Permissão do Service Account:** `workflows.publish`
     * @summary Pausar workflow
     * @param {WorkflowsApiPauseWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public pauseWorkflow(requestParameters: WorkflowsApiPauseWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).pauseWorkflow(requestParameters.id, requestParameters.pauseWorkflowRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Torna o rascunho a versão em execução e muda a situação para `active`. **A partir daqui o workflow age sobre contatos reais**: um gatilho de segmento passa a rodar na agenda; os de formulário e de evento, a cada ocorrência. Valide antes.  A resposta vem em um envelope: `{ \"workflow\": {...} }`.  **Permissão do Service Account:** `workflows.publish`
     * @summary Publicar workflow
     * @param {WorkflowsApiPublishWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public publishWorkflow(requestParameters: WorkflowsApiPublishWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).publishWorkflow(requestParameters.id, requestParameters.publishWorkflowRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Volta a situação para `active`. Sem corpo.  **Permissão do Service Account:** `workflows.publish`
     * @summary Retomar workflow
     * @param {WorkflowsApiResumeWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public resumeWorkflow(requestParameters: WorkflowsApiResumeWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).resumeWorkflow(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só o que muda. `draftGraph` substitui o desenho inteiro. A alteração fica no rascunho: quem já está no workflow segue na versão publicada até uma nova publicação.  A resposta vem em um envelope: `{ \"workflow\": {...} }`.  **Permissão do Service Account:** `workflows.edit`
     * @summary Atualizar o rascunho do workflow
     * @param {WorkflowsApiUpdateWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateWorkflow(requestParameters: WorkflowsApiUpdateWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).updateWorkflow(requestParameters.id, requestParameters.updateWorkflowRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Confere o rascunho gravado, ou o `draftGraph` enviado, e devolve os problemas por passo. Com `forPublish: true`, aplica também as exigências da publicação. Lista vazia em `issues` significa pronto para publicar.  **Permissão do Service Account:** `workflows.edit`
     * @summary Validar o desenho do workflow
     * @param {WorkflowsApiValidateWorkflowRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public validateWorkflow(requestParameters: WorkflowsApiValidateWorkflowRequest, options?: RawAxiosRequestConfig) {
        return WorkflowsApiFp(this.configuration).validateWorkflow(requestParameters.id, requestParameters.validateWorkflowRequest, options).then((request) => request(this.axios, this.basePath));
    }
}


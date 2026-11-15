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
import type { CreateFormRequest } from '../models';
// @ts-ignore
import type { Form } from '../models';
// @ts-ignore
import type { GetFormSubmissionsStats200Response } from '../models';
// @ts-ignore
import type { GetFormsStats200Response } from '../models';
// @ts-ignore
import type { LinkSubmissionToContactRequest } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListFormSubmissions200Response } from '../models';
// @ts-ignore
import type { ListForms200Response } from '../models';
// @ts-ignore
import type { SubmitForm201Response } from '../models';
// @ts-ignore
import type { SubmitFormRequest } from '../models';
/**
 * FormsApi - axios parameter creator
 */
export const FormsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Para respostas pendentes. Responde `409` se a resposta já virou contato.
         * @summary Criar contato a partir de uma resposta
         * @param {string} id Identificador da resposta (&#x60;_id&#x60; de 10 caracteres).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createContactFromSubmission: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('createContactFromSubmission', 'id', id)
            const localVarPath = `/api/forms-submissions/{id}/create-contact`
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
         * Cria o formulário em rascunho. O único campo obrigatório é `title`.  **Os campos não são definidos aqui.** A criação monta a grade sozinha, com os campos que a conta exige para um contato da fase escolhida em `settings.contactSource`. Para definir os seus campos, atualize o formulário enviando `grid`.  **Permissão do Service Account:** `forms.create`
         * @summary Criar formulário
         * @param {CreateFormRequest} createFormRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createForm: async (createFormRequest: CreateFormRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createFormRequest' is not null or undefined
            assertParamExists('createForm', 'createFormRequest', createFormRequest)
            const localVarPath = `/api/forms`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createFormRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Traz a grade e, em `components`, os mesmos campos em lista com o campo do contato completo.  **Permissão do Service Account:** `forms.read`
         * @summary Obter formulário
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getForm: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getForm', 'id', id)
            const localVarPath = `/api/forms/{id}`
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
         * @summary Obter totais das respostas
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getFormSubmissionsStats: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getFormSubmissionsStats', 'id', id)
            const localVarPath = `/api/forms/{id}/submissions/stats`
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
         * **Permissão do Service Account:** `forms.read`
         * @summary Obter totais dos formulários
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getFormsStats: async (options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/forms/stats`;
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
         * Responde `409` se a resposta já tem contato.
         * @summary Vincular uma resposta a um contato existente
         * @param {string} id Identificador da resposta (&#x60;_id&#x60; de 10 caracteres).
         * @param {LinkSubmissionToContactRequest} linkSubmissionToContactRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        linkSubmissionToContact: async (id: string, linkSubmissionToContactRequest: LinkSubmissionToContactRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('linkSubmissionToContact', 'id', id)
            // verify required parameter 'linkSubmissionToContactRequest' is not null or undefined
            assertParamExists('linkSubmissionToContact', 'linkSubmissionToContactRequest', linkSubmissionToContactRequest)
            const localVarPath = `/api/forms-submissions/{id}/link`
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
            localVarRequestOptions.data = serializeDataIfNeeded(linkSubmissionToContactRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Da mais recente para a mais antiga.
         * @summary Listar respostas do formulário
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {boolean} [createdInCrm] Com &#x60;true&#x60;, só as que viraram contato; com &#x60;false&#x60;, só as que não.
         * @param {boolean} [pendingLink] Com &#x60;true&#x60;, só as que aguardam vínculo.
         * @param {ListFormSubmissionsPendingReasonEnum} [pendingReason] Motivo da pendência.
         * @param {string} [search] Busca em nome, e-mail, documento e telefone respondidos.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listFormSubmissions: async (id: string, page?: number, limit?: number, createdInCrm?: boolean, pendingLink?: boolean, pendingReason?: ListFormSubmissionsPendingReasonEnum, search?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('listFormSubmissions', 'id', id)
            const localVarPath = `/api/forms/{id}/submissions`
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

            if (createdInCrm !== undefined) {
                localVarQueryParameter['createdInCrm'] = createdInCrm;
            }

            if (pendingLink !== undefined) {
                localVarQueryParameter['pendingLink'] = pendingLink;
            }

            if (pendingReason !== undefined) {
                localVarQueryParameter['pendingReason'] = pendingReason;
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
         * Ordenação padrão: `title`.  **Permissão do Service Account:** `forms.list`
         * @summary Listar formulários
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListFormsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [search] Busca no título.
         * @param {string} [folderId] ID da pasta, ou &#x60;none&#x60; para os que estão fora de pasta.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listForms: async (page?: number, limit?: number, sortBy?: string, sortType?: ListFormsSortTypeEnum, search?: string, folderId?: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/forms`;
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
         * Registra uma resposta como se a pessoa tivesse preenchido o formulário. Use para trazer respostas coletadas em outro lugar.  `payload` tem o formato de um contato: campos de sistema pelo nome (`fullname`, `email`, `doc`, `phones`) e campos personalizados em `customFields`, com `customField` e `v`. Com `settings.autoCreateContact` ligado, a resposta cria ou atualiza o contato; desligado, fica pendente.
         * @summary Enviar uma resposta
         * @param {string} id ID do registro.
         * @param {SubmitFormRequest} submitFormRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        submitForm: async (id: string, submitFormRequest: SubmitFormRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('submitForm', 'id', id)
            // verify required parameter 'submitFormRequest' is not null or undefined
            assertParamExists('submitForm', 'submitFormRequest', submitFormRequest)
            const localVarPath = `/api/forms/{id}/submit`
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
            localVarRequestOptions.data = serializeDataIfNeeded(submitFormRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Envie `title` e o que muda. Para trocar os campos, envie a `grid` inteira: ela substitui a anterior.  Na grade, `componentType` aceita `customField` e `consent`. Outros tipos de componente da tela (título, texto, separador) são recusados com `400`. Uma atualização recusada deixa o formulário sem a lista de campos até a próxima atualização aceita: reenvie a grade corrigida em seguida.  `status`, `published` e `shareLink` não mudam por aqui.  **Permissão do Service Account:** `forms.update`
         * @summary Atualizar formulário
         * @param {string} id ID do registro.
         * @param {CreateFormRequest} createFormRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateForm: async (id: string, createFormRequest: CreateFormRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateForm', 'id', id)
            // verify required parameter 'createFormRequest' is not null or undefined
            assertParamExists('updateForm', 'createFormRequest', createFormRequest)
            const localVarPath = `/api/forms/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(createFormRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * FormsApi - functional programming interface
 */
export const FormsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = FormsApiAxiosParamCreator(configuration)
    return {
        /**
         * Para respostas pendentes. Responde `409` se a resposta já virou contato.
         * @summary Criar contato a partir de uma resposta
         * @param {string} id Identificador da resposta (&#x60;_id&#x60; de 10 caracteres).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createContactFromSubmission(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<object>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createContactFromSubmission(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.createContactFromSubmission']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Cria o formulário em rascunho. O único campo obrigatório é `title`.  **Os campos não são definidos aqui.** A criação monta a grade sozinha, com os campos que a conta exige para um contato da fase escolhida em `settings.contactSource`. Para definir os seus campos, atualize o formulário enviando `grid`.  **Permissão do Service Account:** `forms.create`
         * @summary Criar formulário
         * @param {CreateFormRequest} createFormRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createForm(createFormRequest: CreateFormRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Form>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createForm(createFormRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.createForm']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Traz a grade e, em `components`, os mesmos campos em lista com o campo do contato completo.  **Permissão do Service Account:** `forms.read`
         * @summary Obter formulário
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getForm(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Form>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getForm(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.getForm']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Obter totais das respostas
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getFormSubmissionsStats(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetFormSubmissionsStats200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getFormSubmissionsStats(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.getFormSubmissionsStats']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `forms.read`
         * @summary Obter totais dos formulários
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getFormsStats(options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<GetFormsStats200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getFormsStats(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.getFormsStats']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Responde `409` se a resposta já tem contato.
         * @summary Vincular uma resposta a um contato existente
         * @param {string} id Identificador da resposta (&#x60;_id&#x60; de 10 caracteres).
         * @param {LinkSubmissionToContactRequest} linkSubmissionToContactRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async linkSubmissionToContact(id: string, linkSubmissionToContactRequest: LinkSubmissionToContactRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<object>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.linkSubmissionToContact(id, linkSubmissionToContactRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.linkSubmissionToContact']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Da mais recente para a mais antiga.
         * @summary Listar respostas do formulário
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {boolean} [createdInCrm] Com &#x60;true&#x60;, só as que viraram contato; com &#x60;false&#x60;, só as que não.
         * @param {boolean} [pendingLink] Com &#x60;true&#x60;, só as que aguardam vínculo.
         * @param {ListFormSubmissionsPendingReasonEnum} [pendingReason] Motivo da pendência.
         * @param {string} [search] Busca em nome, e-mail, documento e telefone respondidos.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listFormSubmissions(id: string, page?: number, limit?: number, createdInCrm?: boolean, pendingLink?: boolean, pendingReason?: ListFormSubmissionsPendingReasonEnum, search?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListFormSubmissions200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listFormSubmissions(id, page, limit, createdInCrm, pendingLink, pendingReason, search, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.listFormSubmissions']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `title`.  **Permissão do Service Account:** `forms.list`
         * @summary Listar formulários
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListFormsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {string} [search] Busca no título.
         * @param {string} [folderId] ID da pasta, ou &#x60;none&#x60; para os que estão fora de pasta.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listForms(page?: number, limit?: number, sortBy?: string, sortType?: ListFormsSortTypeEnum, search?: string, folderId?: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListForms200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listForms(page, limit, sortBy, sortType, search, folderId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.listForms']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Registra uma resposta como se a pessoa tivesse preenchido o formulário. Use para trazer respostas coletadas em outro lugar.  `payload` tem o formato de um contato: campos de sistema pelo nome (`fullname`, `email`, `doc`, `phones`) e campos personalizados em `customFields`, com `customField` e `v`. Com `settings.autoCreateContact` ligado, a resposta cria ou atualiza o contato; desligado, fica pendente.
         * @summary Enviar uma resposta
         * @param {string} id ID do registro.
         * @param {SubmitFormRequest} submitFormRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async submitForm(id: string, submitFormRequest: SubmitFormRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<SubmitForm201Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.submitForm(id, submitFormRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.submitForm']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie `title` e o que muda. Para trocar os campos, envie a `grid` inteira: ela substitui a anterior.  Na grade, `componentType` aceita `customField` e `consent`. Outros tipos de componente da tela (título, texto, separador) são recusados com `400`. Uma atualização recusada deixa o formulário sem a lista de campos até a próxima atualização aceita: reenvie a grade corrigida em seguida.  `status`, `published` e `shareLink` não mudam por aqui.  **Permissão do Service Account:** `forms.update`
         * @summary Atualizar formulário
         * @param {string} id ID do registro.
         * @param {CreateFormRequest} createFormRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateForm(id: string, createFormRequest: CreateFormRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Form>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateForm(id, createFormRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['FormsApi.updateForm']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * FormsApi - factory interface
 */
export const FormsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = FormsApiFp(configuration)
    return {
        /**
         * Para respostas pendentes. Responde `409` se a resposta já virou contato.
         * @summary Criar contato a partir de uma resposta
         * @param {FormsApiCreateContactFromSubmissionRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createContactFromSubmission(requestParameters: FormsApiCreateContactFromSubmissionRequest, options?: RawAxiosRequestConfig): AxiosPromise<object> {
            return localVarFp.createContactFromSubmission(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Cria o formulário em rascunho. O único campo obrigatório é `title`.  **Os campos não são definidos aqui.** A criação monta a grade sozinha, com os campos que a conta exige para um contato da fase escolhida em `settings.contactSource`. Para definir os seus campos, atualize o formulário enviando `grid`.  **Permissão do Service Account:** `forms.create`
         * @summary Criar formulário
         * @param {FormsApiCreateFormRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createForm(requestParameters: FormsApiCreateFormRequest, options?: RawAxiosRequestConfig): AxiosPromise<Form> {
            return localVarFp.createForm(requestParameters.createFormRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Traz a grade e, em `components`, os mesmos campos em lista com o campo do contato completo.  **Permissão do Service Account:** `forms.read`
         * @summary Obter formulário
         * @param {FormsApiGetFormRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getForm(requestParameters: FormsApiGetFormRequest, options?: RawAxiosRequestConfig): AxiosPromise<Form> {
            return localVarFp.getForm(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Obter totais das respostas
         * @param {FormsApiGetFormSubmissionsStatsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getFormSubmissionsStats(requestParameters: FormsApiGetFormSubmissionsStatsRequest, options?: RawAxiosRequestConfig): AxiosPromise<GetFormSubmissionsStats200Response> {
            return localVarFp.getFormSubmissionsStats(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `forms.read`
         * @summary Obter totais dos formulários
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getFormsStats(options?: RawAxiosRequestConfig): AxiosPromise<GetFormsStats200Response> {
            return localVarFp.getFormsStats(options).then((request) => request(axios, basePath));
        },
        /**
         * Responde `409` se a resposta já tem contato.
         * @summary Vincular uma resposta a um contato existente
         * @param {FormsApiLinkSubmissionToContactRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        linkSubmissionToContact(requestParameters: FormsApiLinkSubmissionToContactRequest, options?: RawAxiosRequestConfig): AxiosPromise<object> {
            return localVarFp.linkSubmissionToContact(requestParameters.id, requestParameters.linkSubmissionToContactRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Da mais recente para a mais antiga.
         * @summary Listar respostas do formulário
         * @param {FormsApiListFormSubmissionsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listFormSubmissions(requestParameters: FormsApiListFormSubmissionsRequest, options?: RawAxiosRequestConfig): AxiosPromise<ListFormSubmissions200Response> {
            return localVarFp.listFormSubmissions(requestParameters.id, requestParameters.page, requestParameters.limit, requestParameters.createdInCrm, requestParameters.pendingLink, requestParameters.pendingReason, requestParameters.search, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `title`.  **Permissão do Service Account:** `forms.list`
         * @summary Listar formulários
         * @param {FormsApiListFormsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listForms(requestParameters: FormsApiListFormsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListForms200Response> {
            return localVarFp.listForms(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.search, requestParameters.folderId, options).then((request) => request(axios, basePath));
        },
        /**
         * Registra uma resposta como se a pessoa tivesse preenchido o formulário. Use para trazer respostas coletadas em outro lugar.  `payload` tem o formato de um contato: campos de sistema pelo nome (`fullname`, `email`, `doc`, `phones`) e campos personalizados em `customFields`, com `customField` e `v`. Com `settings.autoCreateContact` ligado, a resposta cria ou atualiza o contato; desligado, fica pendente.
         * @summary Enviar uma resposta
         * @param {FormsApiSubmitFormRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        submitForm(requestParameters: FormsApiSubmitFormRequest, options?: RawAxiosRequestConfig): AxiosPromise<SubmitForm201Response> {
            return localVarFp.submitForm(requestParameters.id, requestParameters.submitFormRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie `title` e o que muda. Para trocar os campos, envie a `grid` inteira: ela substitui a anterior.  Na grade, `componentType` aceita `customField` e `consent`. Outros tipos de componente da tela (título, texto, separador) são recusados com `400`. Uma atualização recusada deixa o formulário sem a lista de campos até a próxima atualização aceita: reenvie a grade corrigida em seguida.  `status`, `published` e `shareLink` não mudam por aqui.  **Permissão do Service Account:** `forms.update`
         * @summary Atualizar formulário
         * @param {FormsApiUpdateFormRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateForm(requestParameters: FormsApiUpdateFormRequest, options?: RawAxiosRequestConfig): AxiosPromise<Form> {
            return localVarFp.updateForm(requestParameters.id, requestParameters.createFormRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createContactFromSubmission operation in FormsApi.
 */
export interface FormsApiCreateContactFromSubmissionRequest {
    /**
     * Identificador da resposta (&#x60;_id&#x60; de 10 caracteres).
     */
    readonly id: string
}

/**
 * Request parameters for createForm operation in FormsApi.
 */
export interface FormsApiCreateFormRequest {
    readonly createFormRequest: CreateFormRequest
}

/**
 * Request parameters for getForm operation in FormsApi.
 */
export interface FormsApiGetFormRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getFormSubmissionsStats operation in FormsApi.
 */
export interface FormsApiGetFormSubmissionsStatsRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for linkSubmissionToContact operation in FormsApi.
 */
export interface FormsApiLinkSubmissionToContactRequest {
    /**
     * Identificador da resposta (&#x60;_id&#x60; de 10 caracteres).
     */
    readonly id: string

    readonly linkSubmissionToContactRequest: LinkSubmissionToContactRequest
}

/**
 * Request parameters for listFormSubmissions operation in FormsApi.
 */
export interface FormsApiListFormSubmissionsRequest {
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
     * Com &#x60;true&#x60;, só as que viraram contato; com &#x60;false&#x60;, só as que não.
     */
    readonly createdInCrm?: boolean

    /**
     * Com &#x60;true&#x60;, só as que aguardam vínculo.
     */
    readonly pendingLink?: boolean

    /**
     * Motivo da pendência.
     */
    readonly pendingReason?: ListFormSubmissionsPendingReasonEnum

    /**
     * Busca em nome, e-mail, documento e telefone respondidos.
     */
    readonly search?: string
}

/**
 * Request parameters for listForms operation in FormsApi.
 */
export interface FormsApiListFormsRequest {
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
    readonly sortType?: ListFormsSortTypeEnum

    /**
     * Busca no título.
     */
    readonly search?: string

    /**
     * ID da pasta, ou &#x60;none&#x60; para os que estão fora de pasta.
     */
    readonly folderId?: string
}

/**
 * Request parameters for submitForm operation in FormsApi.
 */
export interface FormsApiSubmitFormRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly submitFormRequest: SubmitFormRequest
}

/**
 * Request parameters for updateForm operation in FormsApi.
 */
export interface FormsApiUpdateFormRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly createFormRequest: CreateFormRequest
}

/**
 * FormsApi - object-oriented interface
 */
export class FormsApi extends BaseAPI {
    /**
     * Para respostas pendentes. Responde `409` se a resposta já virou contato.
     * @summary Criar contato a partir de uma resposta
     * @param {FormsApiCreateContactFromSubmissionRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createContactFromSubmission(requestParameters: FormsApiCreateContactFromSubmissionRequest, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).createContactFromSubmission(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Cria o formulário em rascunho. O único campo obrigatório é `title`.  **Os campos não são definidos aqui.** A criação monta a grade sozinha, com os campos que a conta exige para um contato da fase escolhida em `settings.contactSource`. Para definir os seus campos, atualize o formulário enviando `grid`.  **Permissão do Service Account:** `forms.create`
     * @summary Criar formulário
     * @param {FormsApiCreateFormRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createForm(requestParameters: FormsApiCreateFormRequest, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).createForm(requestParameters.createFormRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Traz a grade e, em `components`, os mesmos campos em lista com o campo do contato completo.  **Permissão do Service Account:** `forms.read`
     * @summary Obter formulário
     * @param {FormsApiGetFormRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getForm(requestParameters: FormsApiGetFormRequest, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).getForm(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Obter totais das respostas
     * @param {FormsApiGetFormSubmissionsStatsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getFormSubmissionsStats(requestParameters: FormsApiGetFormSubmissionsStatsRequest, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).getFormSubmissionsStats(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `forms.read`
     * @summary Obter totais dos formulários
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getFormsStats(options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).getFormsStats(options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Responde `409` se a resposta já tem contato.
     * @summary Vincular uma resposta a um contato existente
     * @param {FormsApiLinkSubmissionToContactRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public linkSubmissionToContact(requestParameters: FormsApiLinkSubmissionToContactRequest, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).linkSubmissionToContact(requestParameters.id, requestParameters.linkSubmissionToContactRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Da mais recente para a mais antiga.
     * @summary Listar respostas do formulário
     * @param {FormsApiListFormSubmissionsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listFormSubmissions(requestParameters: FormsApiListFormSubmissionsRequest, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).listFormSubmissions(requestParameters.id, requestParameters.page, requestParameters.limit, requestParameters.createdInCrm, requestParameters.pendingLink, requestParameters.pendingReason, requestParameters.search, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `title`.  **Permissão do Service Account:** `forms.list`
     * @summary Listar formulários
     * @param {FormsApiListFormsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listForms(requestParameters: FormsApiListFormsRequest = {}, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).listForms(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.search, requestParameters.folderId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Registra uma resposta como se a pessoa tivesse preenchido o formulário. Use para trazer respostas coletadas em outro lugar.  `payload` tem o formato de um contato: campos de sistema pelo nome (`fullname`, `email`, `doc`, `phones`) e campos personalizados em `customFields`, com `customField` e `v`. Com `settings.autoCreateContact` ligado, a resposta cria ou atualiza o contato; desligado, fica pendente.
     * @summary Enviar uma resposta
     * @param {FormsApiSubmitFormRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public submitForm(requestParameters: FormsApiSubmitFormRequest, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).submitForm(requestParameters.id, requestParameters.submitFormRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie `title` e o que muda. Para trocar os campos, envie a `grid` inteira: ela substitui a anterior.  Na grade, `componentType` aceita `customField` e `consent`. Outros tipos de componente da tela (título, texto, separador) são recusados com `400`. Uma atualização recusada deixa o formulário sem a lista de campos até a próxima atualização aceita: reenvie a grade corrigida em seguida.  `status`, `published` e `shareLink` não mudam por aqui.  **Permissão do Service Account:** `forms.update`
     * @summary Atualizar formulário
     * @param {FormsApiUpdateFormRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateForm(requestParameters: FormsApiUpdateFormRequest, options?: RawAxiosRequestConfig) {
        return FormsApiFp(this.configuration).updateForm(requestParameters.id, requestParameters.createFormRequest, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListFormSubmissionsPendingReasonEnum = {
    auto_create_disabled: 'auto_create_disabled',
    contact_creation_failed: 'contact_creation_failed',
} as const;
export type ListFormSubmissionsPendingReasonEnum = typeof ListFormSubmissionsPendingReasonEnum[keyof typeof ListFormSubmissionsPendingReasonEnum];
export const ListFormsSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListFormsSortTypeEnum = typeof ListFormsSortTypeEnum[keyof typeof ListFormsSortTypeEnum];

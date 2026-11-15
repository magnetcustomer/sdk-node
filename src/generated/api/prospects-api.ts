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
import type { Contact } from '../models';
// @ts-ignore
import type { ContactInput } from '../models';
// @ts-ignore
import type { ListContacts200Response } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
/**
 * ProspectsApi - axios parameter creator
 */
export const ProspectsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * O corpo não tem campo obrigatório fixo: o administrador da conta define quais são. `GET /api/customfields?feature=contact&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`. Os registros criados por aqui entram como `prospect`.
         * @summary Criar prospect
         * @param {ContactInput} contactInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createProspect: async (contactInput: ContactInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'contactInput' is not null or undefined
            assertParamExists('createProspect', 'contactInput', contactInput)
            const localVarPath = `/api/prospects`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(contactInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Exige a permissão de excluir.
         * @summary Excluir prospect
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteProspect: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteProspect', 'id', id)
            const localVarPath = `/api/prospects/{id}`
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
         * @summary Obter prospect
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getProspect: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getProspect', 'id', id)
            const localVarPath = `/api/prospects/{id}`
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
         * Ordenação padrão: `fullname` crescente. Tamanho de página padrão: 25. Devolve só os registros ativos, como `GET /api/contacts?lifeCycle=prospect`.
         * @summary Listar prospects
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListProspectsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {Array<string>} [staffs] Usuários responsáveis. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [organization] ID da empresa vinculada.
         * @param {string} [search] Busca em nome, e-mail, telefone e documento.
         * @param {boolean} [emailsEmpty] Com &#x60;true&#x60;, só os sem e-mail.
         * @param {boolean} [phonesEmpty] Com &#x60;true&#x60;, só os sem telefone.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listProspects: async (page?: number, limit?: number, sortBy?: string, sortType?: ListProspectsSortTypeEnum, staffs?: Array<string>, organization?: string, search?: string, emailsEmpty?: boolean, phonesEmpty?: boolean, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/prospects`;
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

            if (staffs) {
                localVarQueryParameter['staffs[]'] = staffs;
            }

            if (organization !== undefined) {
                localVarQueryParameter['organization'] = organization;
            }

            if (search !== undefined) {
                localVarQueryParameter['search'] = search;
            }

            if (emailsEmpty !== undefined) {
                localVarQueryParameter['emailsEmpty'] = emailsEmpty;
            }

            if (phonesEmpty !== undefined) {
                localVarQueryParameter['phonesEmpty'] = phonesEmpty;
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
         * Envie só os campos que mudam.
         * @summary Atualizar prospect
         * @param {string} id ID do registro.
         * @param {ContactInput} contactInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateProspect: async (id: string, contactInput: ContactInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateProspect', 'id', id)
            // verify required parameter 'contactInput' is not null or undefined
            assertParamExists('updateProspect', 'contactInput', contactInput)
            const localVarPath = `/api/prospects/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(contactInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * ProspectsApi - functional programming interface
 */
export const ProspectsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = ProspectsApiAxiosParamCreator(configuration)
    return {
        /**
         * O corpo não tem campo obrigatório fixo: o administrador da conta define quais são. `GET /api/customfields?feature=contact&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`. Os registros criados por aqui entram como `prospect`.
         * @summary Criar prospect
         * @param {ContactInput} contactInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createProspect(contactInput: ContactInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Contact>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createProspect(contactInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProspectsApi.createProspect']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Exige a permissão de excluir.
         * @summary Excluir prospect
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteProspect(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteProspect(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProspectsApi.deleteProspect']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * 
         * @summary Obter prospect
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getProspect(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Contact>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getProspect(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProspectsApi.getProspect']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `fullname` crescente. Tamanho de página padrão: 25. Devolve só os registros ativos, como `GET /api/contacts?lifeCycle=prospect`.
         * @summary Listar prospects
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [sortBy] Campo de ordenação. O padrão varia por recurso.
         * @param {ListProspectsSortTypeEnum} [sortType] Direção da ordenação.
         * @param {Array<string>} [staffs] Usuários responsáveis. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
         * @param {string} [organization] ID da empresa vinculada.
         * @param {string} [search] Busca em nome, e-mail, telefone e documento.
         * @param {boolean} [emailsEmpty] Com &#x60;true&#x60;, só os sem e-mail.
         * @param {boolean} [phonesEmpty] Com &#x60;true&#x60;, só os sem telefone.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listProspects(page?: number, limit?: number, sortBy?: string, sortType?: ListProspectsSortTypeEnum, staffs?: Array<string>, organization?: string, search?: string, emailsEmpty?: boolean, phonesEmpty?: boolean, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListContacts200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listProspects(page, limit, sortBy, sortType, staffs, organization, search, emailsEmpty, phonesEmpty, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProspectsApi.listProspects']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só os campos que mudam.
         * @summary Atualizar prospect
         * @param {string} id ID do registro.
         * @param {ContactInput} contactInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateProspect(id: string, contactInput: ContactInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Contact>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateProspect(id, contactInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProspectsApi.updateProspect']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * ProspectsApi - factory interface
 */
export const ProspectsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = ProspectsApiFp(configuration)
    return {
        /**
         * O corpo não tem campo obrigatório fixo: o administrador da conta define quais são. `GET /api/customfields?feature=contact&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`. Os registros criados por aqui entram como `prospect`.
         * @summary Criar prospect
         * @param {ProspectsApiCreateProspectRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createProspect(requestParameters: ProspectsApiCreateProspectRequest, options?: RawAxiosRequestConfig): AxiosPromise<Contact> {
            return localVarFp.createProspect(requestParameters.contactInput, options).then((request) => request(axios, basePath));
        },
        /**
         * Exige a permissão de excluir.
         * @summary Excluir prospect
         * @param {ProspectsApiDeleteProspectRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteProspect(requestParameters: ProspectsApiDeleteProspectRequest, options?: RawAxiosRequestConfig): AxiosPromise<void> {
            return localVarFp.deleteProspect(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Obter prospect
         * @param {ProspectsApiGetProspectRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getProspect(requestParameters: ProspectsApiGetProspectRequest, options?: RawAxiosRequestConfig): AxiosPromise<Contact> {
            return localVarFp.getProspect(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `fullname` crescente. Tamanho de página padrão: 25. Devolve só os registros ativos, como `GET /api/contacts?lifeCycle=prospect`.
         * @summary Listar prospects
         * @param {ProspectsApiListProspectsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listProspects(requestParameters: ProspectsApiListProspectsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListContacts200Response> {
            return localVarFp.listProspects(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.staffs, requestParameters.organization, requestParameters.search, requestParameters.emailsEmpty, requestParameters.phonesEmpty, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só os campos que mudam.
         * @summary Atualizar prospect
         * @param {ProspectsApiUpdateProspectRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateProspect(requestParameters: ProspectsApiUpdateProspectRequest, options?: RawAxiosRequestConfig): AxiosPromise<Contact> {
            return localVarFp.updateProspect(requestParameters.id, requestParameters.contactInput, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createProspect operation in ProspectsApi.
 */
export interface ProspectsApiCreateProspectRequest {
    readonly contactInput: ContactInput
}

/**
 * Request parameters for deleteProspect operation in ProspectsApi.
 */
export interface ProspectsApiDeleteProspectRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getProspect operation in ProspectsApi.
 */
export interface ProspectsApiGetProspectRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listProspects operation in ProspectsApi.
 */
export interface ProspectsApiListProspectsRequest {
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
    readonly sortType?: ListProspectsSortTypeEnum

    /**
     * Usuários responsáveis. Lista de IDs (&#x60;?staffs[]&#x3D;id1&amp;staffs[]&#x3D;id2&#x60;).
     */
    readonly staffs?: Array<string>

    /**
     * ID da empresa vinculada.
     */
    readonly organization?: string

    /**
     * Busca em nome, e-mail, telefone e documento.
     */
    readonly search?: string

    /**
     * Com &#x60;true&#x60;, só os sem e-mail.
     */
    readonly emailsEmpty?: boolean

    /**
     * Com &#x60;true&#x60;, só os sem telefone.
     */
    readonly phonesEmpty?: boolean
}

/**
 * Request parameters for updateProspect operation in ProspectsApi.
 */
export interface ProspectsApiUpdateProspectRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly contactInput: ContactInput
}

/**
 * ProspectsApi - object-oriented interface
 */
export class ProspectsApi extends BaseAPI {
    /**
     * O corpo não tem campo obrigatório fixo: o administrador da conta define quais são. `GET /api/customfields?feature=contact&required=true` devolve os campos obrigatórios da conta. Quando falta um deles, a API responde `400` com `code: MISSING_REQUIRED` e a lista em `fields`. Os registros criados por aqui entram como `prospect`.
     * @summary Criar prospect
     * @param {ProspectsApiCreateProspectRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createProspect(requestParameters: ProspectsApiCreateProspectRequest, options?: RawAxiosRequestConfig) {
        return ProspectsApiFp(this.configuration).createProspect(requestParameters.contactInput, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Exige a permissão de excluir.
     * @summary Excluir prospect
     * @param {ProspectsApiDeleteProspectRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteProspect(requestParameters: ProspectsApiDeleteProspectRequest, options?: RawAxiosRequestConfig) {
        return ProspectsApiFp(this.configuration).deleteProspect(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Obter prospect
     * @param {ProspectsApiGetProspectRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getProspect(requestParameters: ProspectsApiGetProspectRequest, options?: RawAxiosRequestConfig) {
        return ProspectsApiFp(this.configuration).getProspect(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `fullname` crescente. Tamanho de página padrão: 25. Devolve só os registros ativos, como `GET /api/contacts?lifeCycle=prospect`.
     * @summary Listar prospects
     * @param {ProspectsApiListProspectsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listProspects(requestParameters: ProspectsApiListProspectsRequest = {}, options?: RawAxiosRequestConfig) {
        return ProspectsApiFp(this.configuration).listProspects(requestParameters.page, requestParameters.limit, requestParameters.sortBy, requestParameters.sortType, requestParameters.staffs, requestParameters.organization, requestParameters.search, requestParameters.emailsEmpty, requestParameters.phonesEmpty, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só os campos que mudam.
     * @summary Atualizar prospect
     * @param {ProspectsApiUpdateProspectRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateProspect(requestParameters: ProspectsApiUpdateProspectRequest, options?: RawAxiosRequestConfig) {
        return ProspectsApiFp(this.configuration).updateProspect(requestParameters.id, requestParameters.contactInput, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListProspectsSortTypeEnum = {
    asc: 'asc',
    desc: 'desc',
} as const;
export type ListProspectsSortTypeEnum = typeof ListProspectsSortTypeEnum[keyof typeof ListProspectsSortTypeEnum];

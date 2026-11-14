/* tslint:disable */
/* eslint-disable */
/**
 * API da Magnet Customer
 * A API REST da Magnet Customer permite ler e gravar os registros do CRM a partir dos seus sistemas.  # Comece aqui  ## 1. Crie um Service Account  No CRM, abra **Configurações › Service Accounts** (apenas administradores), clique em **Novo service account**, escolha a validade e as permissões, e copie o **Client ID** e o **Client Secret**. O secret aparece uma única vez.  ## 2. Solicite um token  ```bash curl -X POST https://magnetcustomer.net/realms/platform/protocol/openid-connect/token \\   -H \"Content-Type: application/x-www-form-urlencoded\" \\   -d \"grant_type=client_credentials\" \\   -d \"client_id=SEU_CLIENT_ID\" \\   -d \"client_secret=SEU_CLIENT_SECRET\" ```  ```json { \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\", \"expires_in\": 900, \"token_type\": \"Bearer\" } ```  O token vale 15 minutos e este fluxo não tem refresh token: quando vencer, ou ao receber `401`, repita o pedido.  ## 3. Chame a API  Cada conta tem o seu endereço. Troque `sua-conta` pelo subdomínio que você usa para abrir o CRM:  ```bash curl \"https://sua-conta.platform-api.magnetcustomer.com/api/deals?page=1&limit=15\" \\   -H \"Authorization: Bearer SEU_TOKEN\" ```  Requisições com corpo levam também `Content-Type: application/json`.  # Convenções  ## Paginação  Envie sempre `page`. Com ele, toda listagem devolve o mesmo envelope:  ```json { \"docs\": [], \"total\": 132, \"pages\": 9, \"page\": 1, \"limit\": 15 } ```  | Parâmetro | Padrão | Descrição | |---|---|---| | `page` | — | Página, a partir de 1. **Obrigatório na prática** | | `limit` | 15 | Registros por página. Máximo 100: acima disso a API usa 100 | | `sortBy` | varia por recurso | Campo de ordenação | | `sortType` | `desc` | `asc` ou `desc` | | `search` | — | Busca textual, quando o recurso aceita |  Sem `page`, algumas listagens (Contatos, Pipelines, Campos personalizados e os cadastros de apoio, como tipos e situações) devolvem uma lista simples (`[...]`), sem o envelope, e ignoram `limit`. Para percorrer tudo, peça `page=1` e avance até `page` ser igual a `pages`. Uma página além do fim devolve `docs` vazio.  O tamanho de página padrão é 15, com duas exceções: 25 em Leads, Prospects e Clientes, e 100 em Usuários. Um `limit` inválido cai no padrão.  ## Identificadores e datas  Todo ID é um texto de 24 caracteres hexadecimais, como `507f1f77bcf86cd799439011`. Ao gravar, envie a referência como **ID em texto** — nunca o objeto.  Um ID fora desse formato hoje é respondido com `500`, não `400`: valide o formato antes de enviar.  No corpo e nas respostas, datas são ISO 8601 em UTC, como `2026-05-15T10:00:00Z`. Nos filtros de data da URL (`minDate`, `createdAt_minDate`, `dateOfExpires_minDate`...), envie um **timestamp em milissegundos**, como `1798761600000`.  ## Listas na URL  Filtros que aceitam vários valores levam colchetes no nome, mesmo quando o valor é um só:  ``` /api/contacts?page=1&staffs[]=507f191e810c19729de860eb&staffs[]=507f191e810c19729de860ec ```  Sem colchetes, um valor único é recusado com erro em parte das listagens.  ## Campos ausentes  Campo sem valor costuma vir **ausente** da resposta, não como `null`. Trate a falta da chave como vazio.  ## Campos personalizados  Os campos criados pelo administrador da conta vão na lista `customFields`:  ```json { \"customFields\": [ { \"customField\": \"507f1f77bcf86cd799439014\", \"k\": \"segmento\", \"v\": \"Tecnologia\" } ] } ```  O valor vai em **`v`**. Um item com `value` é aceito sem erro, mas o campo fica vazio. Descubra os campos e os IDs com `GET /api/customfields?page=1&feature=deal` (troque `deal` por `meeting`, `task`, `contact`...). Com `&required=true` vêm só os obrigatórios da conta.  ## Erros  ```json {   \"reason\": \"Missing required parameters\",   \"message\": \"Missing required parameters\",   \"code\": \"VALIDATION_ERROR\",   \"errors\": [ { \"field\": \"title\", \"message\": \"must NOT have fewer than 1 characters\", \"keyword\": \"minLength\" } ] } ```  | Status | Quando | |---|---| | `400` | Corpo inválido: campo obrigatório ausente, tipo errado, valor fora da lista | | `401` | Token ausente, inválido ou vencido. Corpo: `{\"reason\": \"Access Denied\"}` | | `403` | O Service Account não tem a permissão da rota (`type: SA_PERMISSION_DENIED`, com `requiredPermission`) | | `404` | Registro não encontrado | | `409` | O registro não está no estado que a operação exige | | `429` | Limite de requisições excedido. Espere o tempo de `Retry-After` |  ## Permissões  Um Service Account só chama as rotas que as permissões dele liberam. Cada operação desta referência informa a permissão exigida, quando há uma: marque-a ao criar o Service Account. Uma chamada sem a permissão devolve `403` com o nome dela em `requiredPermission`.  Rotas de administração da conta (usuários, perfis, criação de webhooks, configurações) exigem um usuário administrador e não estão disponíveis para Service Accounts; por isso não aparecem aqui.  ## Limite de requisições  Os limites são aplicados por conta. Ao receber `429`, espere os segundos indicados em `Retry-After` e tente de novo com intervalo crescente.  ## Área de trabalho  Em contas com áreas de trabalho, a API define a área do registro pela credencial ou pelo registro pai. Não envie `workspace`.  # Webhooks  Para ser avisado quando algo muda no CRM, em vez de consultar a API de tempos em tempos, use webhooks. Um administrador cria o webhook no CRM, em **Integrações › Webhooks**, informando a URL do seu sistema e os eventos. A lista de eventos está em `GET /api/webhooks/triggers`; o formato da entrega, a assinatura e os reenvios estão na seção Webhooks do portal.  # Cobertura  Esta referência cobre Contatos (leads, prospects e clientes), Empresas, Oportunidades, Pipelines, etapas e motivos de perda, Produtos, tabelas de preço e itens de produto, Jornadas, Reuniões, Tarefas, Observações, Tickets, Atendimentos, Usuários, Equipes, Áreas de trabalho, Campos personalizados e os eventos de webhook. 
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
import type { CreateProductRequest } from '../models';
// @ts-ignore
import type { ListDeals401Response } from '../models';
// @ts-ignore
import type { ListDeals403Response } from '../models';
// @ts-ignore
import type { ListProductPricebooks200Response } from '../models';
// @ts-ignore
import type { ListProducts200Response } from '../models';
// @ts-ignore
import type { Product } from '../models';
// @ts-ignore
import type { ProductInput } from '../models';
/**
 * ProductsApi - axios parameter creator
 */
export const ProductsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * O único campo obrigatório é `name`.  **Permissão do Service Account:** `products.create`
         * @summary Criar produto
         * @param {CreateProductRequest} createProductRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createProduct: async (createProductRequest: CreateProductRequest, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createProductRequest' is not null or undefined
            assertParamExists('createProduct', 'createProductRequest', createProductRequest)
            const localVarPath = `/api/products`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createProductRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Exclusão lógica: o produto fica com `active: false` e o `code` ganha um sufixo, liberando o código para um novo produto.  **Permissão do Service Account:** `products.delete`
         * @summary Excluir produto
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteProduct: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteProduct', 'id', id)
            const localVarPath = `/api/products/{id}`
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
         * **Permissão do Service Account:** `products.read`
         * @summary Obter produto
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getProduct: async (id: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getProduct', 'id', id)
            const localVarPath = `/api/products/{id}`
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
         * **Permissão do Service Account:** `products.read`
         * @summary Listar preços do produto por tabela
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listProductPricebooks: async (id: string, page?: number, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('listProductPricebooks', 'id', id)
            const localVarPath = `/api/products/{id}/pricebooks`
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
         * Ordenação padrão: `name` crescente. Devolve o envelope de paginação mesmo sem `page`.  **Permissão do Service Account:** `products.list`
         * @summary Listar produtos
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [search] Busca no nome e no código.
         * @param {ListProductsCategoryEnum} [category] Categoria.
         * @param {ListProductsTypeEnum} [type] Tipo.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listProducts: async (page?: number, limit?: number, search?: string, category?: ListProductsCategoryEnum, type?: ListProductsTypeEnum, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/products`;
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

            if (category !== undefined) {
                localVarQueryParameter['category'] = category;
            }

            if (type !== undefined) {
                localVarQueryParameter['type'] = type;
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
         * Envie só os campos que mudam. `PUT` no mesmo endereço tem o mesmo efeito.  **Permissão do Service Account:** `products.update`
         * @summary Atualizar produto
         * @param {string} id ID do registro.
         * @param {ProductInput} productInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateProduct: async (id: string, productInput: ProductInput, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateProduct', 'id', id)
            // verify required parameter 'productInput' is not null or undefined
            assertParamExists('updateProduct', 'productInput', productInput)
            const localVarPath = `/api/products/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(productInput, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * ProductsApi - functional programming interface
 */
export const ProductsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = ProductsApiAxiosParamCreator(configuration)
    return {
        /**
         * O único campo obrigatório é `name`.  **Permissão do Service Account:** `products.create`
         * @summary Criar produto
         * @param {CreateProductRequest} createProductRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createProduct(createProductRequest: CreateProductRequest, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Product>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createProduct(createProductRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProductsApi.createProduct']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Exclusão lógica: o produto fica com `active: false` e o `code` ganha um sufixo, liberando o código para um novo produto.  **Permissão do Service Account:** `products.delete`
         * @summary Excluir produto
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteProduct(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Product>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteProduct(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProductsApi.deleteProduct']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `products.read`
         * @summary Obter produto
         * @param {string} id ID do registro.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getProduct(id: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Product>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getProduct(id, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProductsApi.getProduct']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * **Permissão do Service Account:** `products.read`
         * @summary Listar preços do produto por tabela
         * @param {string} id ID do registro.
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listProductPricebooks(id: string, page?: number, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListProductPricebooks200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listProductPricebooks(id, page, limit, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProductsApi.listProductPricebooks']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Ordenação padrão: `name` crescente. Devolve o envelope de paginação mesmo sem `page`.  **Permissão do Service Account:** `products.list`
         * @summary Listar produtos
         * @param {number} [page] Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
         * @param {number} [limit] Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
         * @param {string} [search] Busca no nome e no código.
         * @param {ListProductsCategoryEnum} [category] Categoria.
         * @param {ListProductsTypeEnum} [type] Tipo.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listProducts(page?: number, limit?: number, search?: string, category?: ListProductsCategoryEnum, type?: ListProductsTypeEnum, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<ListProducts200Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listProducts(page, limit, search, category, type, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProductsApi.listProducts']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Envie só os campos que mudam. `PUT` no mesmo endereço tem o mesmo efeito.  **Permissão do Service Account:** `products.update`
         * @summary Atualizar produto
         * @param {string} id ID do registro.
         * @param {ProductInput} productInput 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateProduct(id: string, productInput: ProductInput, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Product>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateProduct(id, productInput, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['ProductsApi.updateProduct']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * ProductsApi - factory interface
 */
export const ProductsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = ProductsApiFp(configuration)
    return {
        /**
         * O único campo obrigatório é `name`.  **Permissão do Service Account:** `products.create`
         * @summary Criar produto
         * @param {ProductsApiCreateProductRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createProduct(requestParameters: ProductsApiCreateProductRequest, options?: RawAxiosRequestConfig): AxiosPromise<Product> {
            return localVarFp.createProduct(requestParameters.createProductRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Exclusão lógica: o produto fica com `active: false` e o `code` ganha um sufixo, liberando o código para um novo produto.  **Permissão do Service Account:** `products.delete`
         * @summary Excluir produto
         * @param {ProductsApiDeleteProductRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteProduct(requestParameters: ProductsApiDeleteProductRequest, options?: RawAxiosRequestConfig): AxiosPromise<Product> {
            return localVarFp.deleteProduct(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `products.read`
         * @summary Obter produto
         * @param {ProductsApiGetProductRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getProduct(requestParameters: ProductsApiGetProductRequest, options?: RawAxiosRequestConfig): AxiosPromise<Product> {
            return localVarFp.getProduct(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * **Permissão do Service Account:** `products.read`
         * @summary Listar preços do produto por tabela
         * @param {ProductsApiListProductPricebooksRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listProductPricebooks(requestParameters: ProductsApiListProductPricebooksRequest, options?: RawAxiosRequestConfig): AxiosPromise<ListProductPricebooks200Response> {
            return localVarFp.listProductPricebooks(requestParameters.id, requestParameters.page, requestParameters.limit, options).then((request) => request(axios, basePath));
        },
        /**
         * Ordenação padrão: `name` crescente. Devolve o envelope de paginação mesmo sem `page`.  **Permissão do Service Account:** `products.list`
         * @summary Listar produtos
         * @param {ProductsApiListProductsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listProducts(requestParameters: ProductsApiListProductsRequest = {}, options?: RawAxiosRequestConfig): AxiosPromise<ListProducts200Response> {
            return localVarFp.listProducts(requestParameters.page, requestParameters.limit, requestParameters.search, requestParameters.category, requestParameters.type, options).then((request) => request(axios, basePath));
        },
        /**
         * Envie só os campos que mudam. `PUT` no mesmo endereço tem o mesmo efeito.  **Permissão do Service Account:** `products.update`
         * @summary Atualizar produto
         * @param {ProductsApiUpdateProductRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateProduct(requestParameters: ProductsApiUpdateProductRequest, options?: RawAxiosRequestConfig): AxiosPromise<Product> {
            return localVarFp.updateProduct(requestParameters.id, requestParameters.productInput, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createProduct operation in ProductsApi.
 */
export interface ProductsApiCreateProductRequest {
    readonly createProductRequest: CreateProductRequest
}

/**
 * Request parameters for deleteProduct operation in ProductsApi.
 */
export interface ProductsApiDeleteProductRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for getProduct operation in ProductsApi.
 */
export interface ProductsApiGetProductRequest {
    /**
     * ID do registro.
     */
    readonly id: string
}

/**
 * Request parameters for listProductPricebooks operation in ProductsApi.
 */
export interface ProductsApiListProductPricebooksRequest {
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
 * Request parameters for listProducts operation in ProductsApi.
 */
export interface ProductsApiListProductsRequest {
    /**
     * Página, a partir de 1. **Envie sempre**: sem &#x60;page&#x60;, a resposta vem como lista simples, sem o envelope de paginação, e &#x60;limit&#x60; é ignorado.
     */
    readonly page?: number

    /**
     * Registros por página. Padrão: 15, salvo indicação na operação. Máximo: 100 — acima disso a API usa 100.
     */
    readonly limit?: number

    /**
     * Busca no nome e no código.
     */
    readonly search?: string

    /**
     * Categoria.
     */
    readonly category?: ListProductsCategoryEnum

    /**
     * Tipo.
     */
    readonly type?: ListProductsTypeEnum
}

/**
 * Request parameters for updateProduct operation in ProductsApi.
 */
export interface ProductsApiUpdateProductRequest {
    /**
     * ID do registro.
     */
    readonly id: string

    readonly productInput: ProductInput
}

/**
 * ProductsApi - object-oriented interface
 */
export class ProductsApi extends BaseAPI {
    /**
     * O único campo obrigatório é `name`.  **Permissão do Service Account:** `products.create`
     * @summary Criar produto
     * @param {ProductsApiCreateProductRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public createProduct(requestParameters: ProductsApiCreateProductRequest, options?: RawAxiosRequestConfig) {
        return ProductsApiFp(this.configuration).createProduct(requestParameters.createProductRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Exclusão lógica: o produto fica com `active: false` e o `code` ganha um sufixo, liberando o código para um novo produto.  **Permissão do Service Account:** `products.delete`
     * @summary Excluir produto
     * @param {ProductsApiDeleteProductRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public deleteProduct(requestParameters: ProductsApiDeleteProductRequest, options?: RawAxiosRequestConfig) {
        return ProductsApiFp(this.configuration).deleteProduct(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `products.read`
     * @summary Obter produto
     * @param {ProductsApiGetProductRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public getProduct(requestParameters: ProductsApiGetProductRequest, options?: RawAxiosRequestConfig) {
        return ProductsApiFp(this.configuration).getProduct(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * **Permissão do Service Account:** `products.read`
     * @summary Listar preços do produto por tabela
     * @param {ProductsApiListProductPricebooksRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listProductPricebooks(requestParameters: ProductsApiListProductPricebooksRequest, options?: RawAxiosRequestConfig) {
        return ProductsApiFp(this.configuration).listProductPricebooks(requestParameters.id, requestParameters.page, requestParameters.limit, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Ordenação padrão: `name` crescente. Devolve o envelope de paginação mesmo sem `page`.  **Permissão do Service Account:** `products.list`
     * @summary Listar produtos
     * @param {ProductsApiListProductsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public listProducts(requestParameters: ProductsApiListProductsRequest = {}, options?: RawAxiosRequestConfig) {
        return ProductsApiFp(this.configuration).listProducts(requestParameters.page, requestParameters.limit, requestParameters.search, requestParameters.category, requestParameters.type, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Envie só os campos que mudam. `PUT` no mesmo endereço tem o mesmo efeito.  **Permissão do Service Account:** `products.update`
     * @summary Atualizar produto
     * @param {ProductsApiUpdateProductRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    public updateProduct(requestParameters: ProductsApiUpdateProductRequest, options?: RawAxiosRequestConfig) {
        return ProductsApiFp(this.configuration).updateProduct(requestParameters.id, requestParameters.productInput, options).then((request) => request(this.axios, this.basePath));
    }
}

export const ListProductsCategoryEnum = {
    CATALOG: 'CATALOG',
    PORTFOLIO: 'PORTFOLIO',
} as const;
export type ListProductsCategoryEnum = typeof ListProductsCategoryEnum[keyof typeof ListProductsCategoryEnum];
export const ListProductsTypeEnum = {
    ONE_TIME: 'ONE_TIME',
    RECURRING: 'RECURRING',
} as const;
export type ListProductsTypeEnum = typeof ListProductsTypeEnum[keyof typeof ListProductsTypeEnum];

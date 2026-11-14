import axios, { AxiosInstance } from 'axios';
import { ServiceAccountCredentials, TokenManager } from './auth';
import { Configuration } from './generated/configuration';
import {
    ContactsApi, CustomFieldsApi, CustomersApi, DealsApi, LeadsApi, MeetingsApi, ObservationsApi,
    OrganizationsApi, PipelinesApi, ProspectsApi, StaffsApi, TaskTypesApi, TasksApi,
} from './generated/api';

export interface MagnetCustomerOptions extends ServiceAccountCredentials {
    /** Subdomínio da conta: o mesmo usado para abrir o CRM (`acme` em `acme.magnetcustomer.com`). */
    account: string;
    /** Endereço da API. Por padrão é montado a partir de `account`. */
    baseUrl?: string;
}

/** Monta o endereço da API de uma conta. */
export function buildBaseUrl(account: string): string {
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(account)) {
        throw new Error('account deve ser só o subdomínio da conta, por exemplo "acme".');
    }
    return `https://${account}.platform-api.magnetcustomer.com`;
}

/**
 * Cliente da API da Magnet Customer.
 *
 * Autentica com um Service Account, renova o token sozinho e expõe um objeto por recurso.
 */
export class MagnetCustomer {
    readonly contacts: ContactsApi;
    readonly leads: LeadsApi;
    readonly prospects: ProspectsApi;
    readonly customers: CustomersApi;
    readonly organizations: OrganizationsApi;
    readonly deals: DealsApi;
    readonly pipelines: PipelinesApi;
    readonly meetings: MeetingsApi;
    readonly tasks: TasksApi;
    readonly taskTypes: TaskTypesApi;
    readonly observations: ObservationsApi;
    readonly staffs: StaffsApi;
    readonly customFields: CustomFieldsApi;

    readonly tokens: TokenManager;
    readonly baseUrl: string;

    constructor(options: MagnetCustomerOptions, http: AxiosInstance = axios.create()) {
        this.baseUrl = options.baseUrl ?? buildBaseUrl(options.account);
        this.tokens = new TokenManager(options, http);

        // Um 401 com token guardado quase sempre é token vencido: descarta e tenta uma vez de novo.
        http.interceptors.response.use(undefined, async (error) => {
            const request = error?.config;
            const isApiCall = typeof request?.url === 'string' && request.url.startsWith(this.baseUrl);
            if (error?.response?.status === 401 && isApiCall && !request.retriedAfterUnauthorized) {
                this.tokens.invalidate();
                request.retriedAfterUnauthorized = true;
                request.headers.Authorization = `Bearer ${await this.tokens.getAccessToken()}`;
                return http.request(request);
            }
            throw error;
        });

        const configuration = new Configuration({
            basePath: this.baseUrl,
            accessToken: () => this.tokens.getAccessToken(),
        });
        const build = <T>(Api: new (configuration: Configuration, basePath: string, http: AxiosInstance) => T): T =>
            new Api(configuration, this.baseUrl, http);

        this.contacts = build(ContactsApi);
        this.leads = build(LeadsApi);
        this.prospects = build(ProspectsApi);
        this.customers = build(CustomersApi);
        this.organizations = build(OrganizationsApi);
        this.deals = build(DealsApi);
        this.pipelines = build(PipelinesApi);
        this.meetings = build(MeetingsApi);
        this.tasks = build(TasksApi);
        this.taskTypes = build(TaskTypesApi);
        this.observations = build(ObservationsApi);
        this.staffs = build(StaffsApi);
        this.customFields = build(CustomFieldsApi);
    }
}

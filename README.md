# @magnetcustomer/sdk

SDK oficial da API da [Magnet Customer](https://magnetcustomer.com) para Node.js, com tipos TypeScript.

Ele autentica com um Service Account, renova o token sozinho e expõe um objeto por recurso da API.

- Documentação: <https://magnetcustomer.com/developers>
- Referência da API: <https://magnetcustomer.com/developers/api-reference>

## Instalação

```bash
npm install @magnetcustomer/sdk
```

Requer Node.js 18 ou superior.

## Antes de começar

Crie um Service Account no CRM, em **Configurações › Service Accounts** (apenas administradores), e copie o **Client ID** e o **Client Secret**. Dê a ele só as permissões de que a integração precisa.

Guarde o secret no servidor, em variável de ambiente. Nunca o coloque em navegador ou aplicativo móvel.

## Uso

```ts
import { MagnetCustomer } from '@magnetcustomer/sdk';

const crm = new MagnetCustomer({
  account: 'sua-conta', // o subdomínio que você usa para abrir o CRM
  clientId: process.env.MAGNET_CLIENT_ID!,
  clientSecret: process.env.MAGNET_CLIENT_SECRET!,
});

// Listar: envie sempre `page`
const { data } = await crm.deals.listDeals({ page: 1, limit: 25 });
console.log(data.total, data.docs);

// Criar
const created = await crm.contacts.createContact({
  contactInput: {
    fullname: 'Maria Santos',
    email: 'maria@cliente.com',
    phones: [{ number: '11987654321', ddi: '+55', typePhone: 'cellphone' }],
  },
});

// Atualizar e mover de etapa
await crm.deals.updateDeal({ id: dealId, dealInput: { amount: 90000 } });
await crm.deals.moveDealStage({ id: dealId, moveDealStageRequest: { stageId } });
```

Cada método devolve a resposta do [axios](https://axios-http.com): o corpo está em `data` e o status em `status`.

## Recursos

| Propriedade | Recurso |
|---|---|
| `crm.contacts` | Contatos |
| `crm.leads`, `crm.prospects`, `crm.customers` | Contatos por fase |
| `crm.organizations` | Empresas |
| `crm.deals` | Oportunidades |
| `crm.pipelines` | Pipelines, etapas e motivos de perda |
| `crm.products`, `crm.pricebooks` | Produtos e tabelas de preço |
| `crm.productItems` | Produtos vinculados a oportunidades, contatos e empresas |
| `crm.journeys` | Jornadas (leitura) |
| `crm.meetings` | Reuniões, tipos e salas |
| `crm.tasks`, `crm.taskTypes` | Tarefas e tipos de tarefa |
| `crm.observations` | Observações |
| `crm.tickets` | Tickets, situações e mensagens |
| `crm.treatments` | Atendimentos e tipos |
| `crm.staffs` | Usuários |
| `crm.customFields` | Campos personalizados |
| `crm.teams` | Equipes e áreas de trabalho |
| `crm.webhooks` | Eventos de webhook disponíveis |

Os parâmetros, o corpo aceito e a resposta de cada operação estão na [referência da API](https://magnetcustomer.com/developers/api-reference). Os nomes dos métodos são os `operationId` de lá.

## Paginação

Envie sempre `page`. A resposta traz `docs`, `total`, `pages`, `page` e `limit` (no máximo 100 por página).

```ts
async function* allDeals() {
  for (let page = 1; ; page++) {
    const { data } = await crm.deals.listDeals({ page, limit: 100 });
    yield* data.docs ?? [];
    if (page >= (data.pages ?? 0)) return;
  }
}
```

## Filtros com vários valores

Passe uma lista; o SDK envia no formato que a API espera (`staffs[]=...`), inclusive com um valor só:

```ts
await crm.contacts.listContacts({ page: 1, staffs: [staffId] });
```

## Webhooks

Os webhooks são criados por um administrador no CRM, em **Integrações › Webhooks**. O SDK lista os eventos disponíveis com `crm.webhooks.listWebhookTriggers()`.

## Erros

Uma resposta fora de 2xx lança o erro do axios, com o status e o corpo da API:

```ts
try {
  await crm.deals.getDeal({ id });
} catch (error) {
  if (error.response?.status === 404) {
    // registro não encontrado
  }
  console.error(error.response?.status, error.response?.data);
}
```

| Status | Quando |
|---|---|
| `400` | Corpo ou parâmetros inválidos. `data.errors` ou `data.fields` dizem o que faltou |
| `401` | Credencial inválida. O SDK pede um token novo e repete a chamada uma vez |
| `403` | O Service Account não tem a permissão da rota. `data.requiredPermission` diz qual |
| `404` | Registro não encontrado |
| `429` | Limite de requisições. Espere o tempo do cabeçalho `Retry-After` |

## Token

O token vale 15 minutos. O SDK guarda o token, pede outro um minuto antes de vencer e compartilha o pedido entre chamadas simultâneas. Você não precisa fazer nada.

Para usar o token em outro cliente HTTP:

```ts
const token = await crm.tokens.getAccessToken();
```

## Vindo da versão 1.x

A 2.0 foi refeita a partir da referência atual da API e muda a interface:

- Um cliente só (`new MagnetCustomer({ account, clientId, clientSecret })`) no lugar de `Configuration` + uma classe por API.
- O token é obtido e renovado pelo SDK.
- Os métodos têm os nomes da referência (`listDeals`, `createContact`...) e recebem um objeto de parâmetros.
- A 2.x cobre os recursos da tabela acima, os mesmos da referência pública. Para uma rota fora dela, use o token de `crm.tokens.getAccessToken()` no seu cliente HTTP.

## Desenvolvimento

```bash
npm ci
npm test         # testes
npm run build    # compila para dist/
npm run generate # regenera src/generated a partir de openapi.yaml (requer Java e Python com PyYAML)
```

`openapi.yaml` é a cópia da referência pública. `src/generated` é código gerado: não edite à mão.

## Licença

MIT

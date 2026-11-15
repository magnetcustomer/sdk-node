"""Prepara a especificação pública para gerar o SDK: troca as tags em português por nomes de classe em inglês."""
import sys, yaml

TAGS = {
    "Contatos": "Contacts", "Leads": "Leads", "Prospects": "Prospects", "Clientes": "Customers", "Empresas": "Organizations",
    "Oportunidades": "Deals", "Pipelines e etapas": "Pipelines", "Reuniões": "Meetings", "Tarefas": "Tasks",
    "Tipos de tarefa": "TaskTypes", "Observações": "Observations", "Usuários": "Staffs", "Campos personalizados": "CustomFields",
    "Tickets": "Tickets", "Atendimentos": "Treatments", "Jornadas": "Journeys", "Equipes e áreas de trabalho": "Teams", "Webhooks": "Webhooks",
    "Produtos": "Products", "Tabelas de preço": "Pricebooks", "Itens de produto": "ProductItems",
    "Dashboards": "Dashboards", "Campos para filtros": "ResourceKeywords", "Automações": "Automations",
    "Formulários": "Forms", "Workflows": "Workflows",
}
spec = yaml.safe_load(open(sys.argv[1], encoding="utf-8"))
for methods in spec["paths"].values():
    for operation in methods.values():
        operation["tags"] = [TAGS[tag] for tag in operation["tags"]]
spec["tags"] = [{**tag, "name": TAGS[tag["name"]]} for tag in spec["tags"]]
spec.pop("x-tagGroups", None)
yaml.safe_dump(spec, open(sys.argv[2], "w", encoding="utf-8"), allow_unicode=True, sort_keys=False)

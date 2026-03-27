-- FreteIQ Network Analytics Schema
-- Módulo de Análise de Malha de Transportes

-- shipments: histórico de embarques por rota/lane
create table shipments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,

  -- Rota (Lane)
  origem text not null,           -- ex: "São Paulo/SP"
  destino text not null,          -- ex: "Rio de Janeiro/RJ"
  uf_origem char(2),
  uf_destino char(2),

  -- Transportadora
  transportadora text not null,
  cnpj_transportadora text,
  modalidade text default 'LTL' check (modalidade in ('TL','LTL','Milk-Run','Direto')),

  -- Datas
  data_coleta date not null,
  data_entrega date,
  lead_time_realizado int,        -- dias corridos
  lead_time_prometido int,        -- dias corridos
  no_prazo boolean,

  -- Carga
  peso_kg numeric(12,2),
  valor_carga numeric(14,2),

  -- Custo
  custo_total numeric(14,2) not null,
  custo_frete numeric(14,2),
  custo_por_kg numeric(10,4),

  -- Status
  status_entrega text default 'entregue'
    check (status_entrega in ('entregue','atrasado','avariado','devolvido','extraviado')),
  observacoes text,

  -- Origem do dado
  fonte text default 'manual' check (fonte in ('manual','csv','tms','cte')),
  created_at timestamptz default now()
);

-- network_scenarios: cenários de simulação salvos
create table network_scenarios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,

  nome text not null,
  descricao text,
  tipo text not null check (tipo in (
    'troca_transportadora',
    'mudanca_frequencia',
    'consolidacao_lanes',
    'milk_run',
    'cross_dock'
  )),
  parametros jsonb not null default '{}',
  resultado jsonb,
  economia_estimada numeric(14,2),
  status text default 'rascunho' check (status in ('rascunho','simulado','aprovado','descartado')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- network_reports: relatórios gerados por IA
create table network_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  periodo_inicio date,
  periodo_fim date,
  conteudo text,
  metricas_snapshot jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index idx_shipments_company_id on shipments(company_id);
create index idx_shipments_data_coleta on shipments(data_coleta desc);
create index idx_shipments_lane on shipments(company_id, origem, destino, transportadora);
create index idx_shipments_transportadora on shipments(company_id, transportadora);
create index idx_scenarios_company_id on network_scenarios(company_id);
create index idx_reports_company_id on network_reports(company_id);

-- RLS
alter table shipments enable row level security;
alter table network_scenarios enable row level security;
alter table network_reports enable row level security;

create policy "company isolation on shipments"
  on shipments using (company_id = auth.uid());
create policy "insert shipments"
  on shipments for insert with check (company_id = auth.uid());
create policy "update shipments"
  on shipments for update using (company_id = auth.uid());
create policy "delete shipments"
  on shipments for delete using (company_id = auth.uid());

create policy "company isolation on network_scenarios"
  on network_scenarios using (company_id = auth.uid());
create policy "insert network_scenarios"
  on network_scenarios for insert with check (company_id = auth.uid());
create policy "update network_scenarios"
  on network_scenarios for update using (company_id = auth.uid());
create policy "delete network_scenarios"
  on network_scenarios for delete using (company_id = auth.uid());

create policy "company isolation on network_reports"
  on network_reports using (company_id = auth.uid());
create policy "insert network_reports"
  on network_reports for insert with check (company_id = auth.uid());

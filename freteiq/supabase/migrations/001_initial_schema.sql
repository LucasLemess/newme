-- FreteIQ Initial Schema
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  plan text default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz default now()
);

-- contracts
create table contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  transportadora text not null,
  cnpj_transportadora text,
  icms_rate numeric(5,2),
  freight_rate_per_kg numeric(10,4),
  ad_valorem_rate numeric(5,4),
  max_pedagio numeric(10,2),
  validade_inicio date,
  validade_fim date,
  observacoes text,
  created_at timestamptz default now()
);

-- audit_results
create table audit_results (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  cte_numero text,
  cte_serie text,
  cte_chave text,
  cte_emitente text,
  cte_cnpj text,
  cte_data date,
  valor_total numeric(14,2),
  total_overcharge numeric(14,2),
  status text check (status in ('APROVADO','ATENÇÃO','REPROVADO')),
  findings jsonb,
  xml_raw text,
  contestacao_gerada text,
  analise_estrategica text,
  created_at timestamptz default now()
);

-- indexes
create index idx_contracts_company_id on contracts(company_id);
create index idx_contracts_cnpj_transportadora on contracts(cnpj_transportadora);
create index idx_audit_results_company_id on audit_results(company_id);
create index idx_audit_results_created_at on audit_results(created_at desc);
create index idx_audit_results_status on audit_results(status);

-- RLS
alter table companies enable row level security;
alter table contracts enable row level security;
alter table audit_results enable row level security;

-- Policies
create policy "users can manage own company"
  on companies
  using (id = auth.uid());

create policy "company isolation on contracts"
  on contracts
  using (company_id = auth.uid());

create policy "company isolation on audit_results"
  on audit_results
  using (company_id = auth.uid());

-- Allow insert with company_id = auth.uid()
create policy "insert contracts"
  on contracts for insert
  with check (company_id = auth.uid());

create policy "insert audit_results"
  on audit_results for insert
  with check (company_id = auth.uid());

create policy "update contracts"
  on contracts for update
  using (company_id = auth.uid());

create policy "delete contracts"
  on contracts for delete
  using (company_id = auth.uid());

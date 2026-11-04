-- ProfSuivi : synchronisation en ligne
-- À exécuter une seule fois dans Supabase : menu « SQL Editor » > « New query » > coller > « Run ».

-- Données de l'application (une ligne par professeur)
create table if not exists public.profsuivi_donnees (
  user_id uuid primary key references auth.users (id) on delete cascade,
  donnees jsonb not null,
  maj timestamptz not null default now()
);

-- Sauvegardes automatiques (une par jour, les 30 dernières sont conservées)
create table if not exists public.profsuivi_sauvegardes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  donnees jsonb not null,
  motif text not null default 'quotidienne',
  cree_le timestamptz not null default now()
);
create index if not exists profsuivi_sauvegardes_user on public.profsuivi_sauvegardes (user_id, cree_le desc);

-- Sécurité : chaque professeur ne voit que ses propres données
alter table public.profsuivi_donnees enable row level security;
alter table public.profsuivi_sauvegardes enable row level security;

drop policy if exists "donnees du proprietaire" on public.profsuivi_donnees;
create policy "donnees du proprietaire" on public.profsuivi_donnees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sauvegardes du proprietaire" on public.profsuivi_sauvegardes;
create policy "sauvegardes du proprietaire" on public.profsuivi_sauvegardes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Espace parents (lien privé en lecture seule, sans compte)
-- À exécuter aussi si vous aviez déjà lancé ce script : il peut être relancé sans risque.
-- ============================================================
create table if not exists public.profsuivi_partages (
  jeton text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  eleve_id text not null,
  donnees jsonb not null,
  maj timestamptz not null default now()
);
alter table public.profsuivi_partages enable row level security;
drop policy if exists "partages du proprietaire" on public.profsuivi_partages;
create policy "partages du proprietaire" on public.profsuivi_partages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lecture par le parent : uniquement avec le jeton exact (impossible de lister les autres élèves)
create or replace function public.profsuivi_espace_parent(p_jeton text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select donnees from public.profsuivi_partages where jeton = p_jeton and length(p_jeton) >= 20;
$$;
revoke all on function public.profsuivi_espace_parent(text) from public;
grant execute on function public.profsuivi_espace_parent(text) to anon, authenticated;

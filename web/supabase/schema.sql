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

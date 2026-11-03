# Activer la synchronisation en ligne (Supabase)

But : retrouver les **mêmes données** sur le téléphone et l'ordinateur, avec une **sauvegarde automatique** chaque jour.
Supabase est gratuit pour un usage comme celui-ci (formule « Free »). Comptez 10 minutes, à faire une seule fois.

## 1. Créer le projet
1. Aller sur <https://supabase.com> → **Start your project** → se connecter (avec GitHub, c'est le plus simple).
2. **New project** : nom `profsuivi`, choisir un mot de passe de base de données (à garder), région **Europe (Frankfurt ou Paris)** → **Create new project**. Attendre 1 à 2 minutes.

## 2. Créer les tables
1. Menu de gauche → **SQL Editor** → **New query**.
2. Copier tout le contenu du fichier [`web/supabase/schema.sql`](web/supabase/schema.sql), le coller, cliquer **Run**. Le message « Success » doit s'afficher.

## 3. (Recommandé) Connexion sans e-mail de confirmation
Menu **Authentication** → **Sign In / Providers** → **Email** : désactiver **Confirm email** → **Save**.
(Sinon, après « Créer le compte », il faut cliquer le lien reçu par e-mail avant de se connecter.)

## 4. Relier l'application au projet
Menu **Project Settings** → **API** (ou **Data API**) : noter
- **Project URL** (ex. `https://abcdxyz.supabase.co`)
- la clé **anon / public** (longue suite commençant par `eyJ…`). Cette clé est faite pour être publique : la sécurité est assurée par les règles du script SQL (chaque compte ne voit que ses données).

Deux façons de les donner à l'application :

**A. Une fois pour toutes, dans Vercel (recommandé)** — Vercel → projet → **Settings** → **Environment Variables** :
- `VITE_SUPABASE_URL` = l'adresse du projet
- `VITE_SUPABASE_ANON_KEY` = la clé anon
puis **Deployments** → **Redeploy**. Tous les appareils seront alors prêts automatiquement.

**B. Sur chaque appareil** — dans l'application : **Paramètres → Synchronisation en ligne**, coller l'adresse et la clé, **Enregistrer**.

## 5. Se connecter
Dans **Paramètres → Synchronisation en ligne** :
- sur le premier appareil (celui qui a vos données) : e-mail + mot de passe → **Créer le compte** ;
- sur les autres appareils : même e-mail et mot de passe → **Se connecter**. Les données apparaissent.

Si un appareil contient déjà des données différentes, l'application demande lesquelles garder (l'autre version reste dans les sauvegardes).

## Fonctionnement
- Chaque modification est envoyée quelques secondes après ; les autres appareils la récupèrent à l'ouverture, toutes les minutes et au retour dans l'application.
- L'icône nuage en haut indique l'état (vert = à jour, barré = hors connexion / non connecté).
- Sans Internet, l'application continue de fonctionner ; tout est envoyé au retour de la connexion.
- **Sauvegardes** : une par jour (30 dernières), restaurables depuis **Paramètres → Synchronisation → Sauvegardes**.
- Le code d'accès (1234 par défaut) reste propre à chaque appareil.

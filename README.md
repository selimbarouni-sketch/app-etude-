# ProfSuivi

Gestion de cours particuliers : élèves, groupes, séances et présences, rendez-vous, paiements, notes.

Le dépôt contient **deux versions** de l'application :

| Dossier | Version | Où l'utiliser |
|---|---|---|
| `web/` | Application web (React) | Navigateur, téléphone (installable), hébergée sur **Vercel** |
| `app/` | Application Android (Kotlin / Jetpack Compose) | Téléphone Android (fichier APK) |

## Version web — mise en ligne sur Vercel

1. Aller sur <https://vercel.com/new> et se connecter avec GitHub.
2. Importer le dépôt `app-etude-`.
3. Ne rien changer aux réglages (le fichier `vercel.json` s'en occupe) et cliquer sur **Deploy**.

Chaque nouvelle modification poussée sur la branche principale est ensuite redéployée automatiquement.

Sur téléphone, ouvrir le site puis « Ajouter à l'écran d'accueil » pour l'utiliser comme une application.

> **Important :** les données sont enregistrées dans le navigateur de l'appareil.
> Utilisez *Paramètres → Sauvegarde → Télécharger* régulièrement, et *Restaurer* pour
> transférer vos données vers un autre appareil.

### Lancer en local

```bash
cd web
npm install
npm run dev
```

## Version Android — récupérer l'APK

À chaque modification, GitHub Actions compile l'application :
onglet **Actions** du dépôt → dernier passage « Android – compilation de l'APK » →
section **Artifacts** → `ProfSuivi-apk`.

Pour compiler soi-même : ouvrir le dossier dans Android Studio, ou lancer `./gradlew assembleDebug`.

## Personnaliser

- **Web :** tout est regroupé dans `web/src/config.ts` (nom, slogan, couleurs, devise, indicatif
  téléphonique, groupes d'exemple). Le logo se trouve dans `web/public/icon-*.png`.
- **Android :** nom dans `app/src/main/res/values/strings.xml`, couleurs dans
  `app/src/main/java/com/example/ui/theme/Color.kt`.

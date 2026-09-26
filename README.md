# Hayati — ma vie en équilibre 🌿

**Hayati** (حياتي, « ma vie ») est une application web personnelle pour piloter sa vie au quotidien : **dîn, santé, finances et habitudes**, au même endroit.

- 📱 S’installe sur le téléphone comme une vraie application (PWA) et fonctionne **hors connexion**.
- 🔒 **Aucun compte, aucun serveur** : les données restent dans le navigateur de l’appareil.
- 🇲🇦 Pensée pour le Maroc : horaires de prière du ministère des Habous, dirham (DH), plats marocains, mode Ramadan.

## Les modules

| Module | Contenu |
| --- | --- |
| **Aujourd’hui** | Tableau de bord : prochaine prière et compte à rebours, score d’équilibre du jour, eau, repas, habitudes, budget, Coran, sport, sommeil, humeur, tâches. |
| **Dîn & prières** | Horaires du jour (méthode Maroc calibrée), suivi des 5 prières (à l’heure, en retard, manquée, en groupe), sunna et nawafil, statistiques, rattrapage (qada), khatma du Coran, adhkar, tasbih, calendrier des jeûnes, qibla (boussole), calendrier hégirien, calculateur de zakat. |
| **Hydratation** | Objectif calculé selon le poids (+ bonus les jours de sport), ajout en un geste, historique sur 7 jours, conseils (dont Ramadan). |
| **Nutrition** | Calories et macronutriments, objectif calculé (Mifflin-St Jeor), base d’aliments avec plats marocains, aliments personnels, repas s’hour / ftour pendant le Ramadan. |
| **Sport** | Séances (musculation, foot, course, padel…), calories estimées, objectif hebdomadaire, pas du jour, historique. |
| **Sommeil** | Heures de coucher et de réveil, qualité, réveil pour Fajr, moyennes et conseils. |
| **Poids & corps** | Pesées, courbe d’évolution, IMC, objectif de poids, tour de taille. |
| **Finances** | Dépenses et revenus, budgets par catégorie, charges fixes du mois, objectifs d’épargne, graphiques, export CSV. |
| **Habitudes** | Habitudes quotidiennes ou certains jours, séries, historique sur 17 semaines. |
| **Journal & humeur** | Humeur, énergie, 3 gratitudes, réflexion du jour, tendance sur 30 jours. |
| **Tâches & objectifs** | Tâches avec échéance et priorité, objectifs par domaine de vie avec progression. |

## Mettre l’application en ligne (GitHub Pages)

Le déploiement est automatisé par le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) : il lance les tests, construit l’application et la publie.

1. Sur GitHub, ouvrir **Settings → Pages** et choisir **Source : GitHub Actions** (à faire une seule fois).
2. Ouvrir l’onglet **Actions → Déploiement GitHub Pages → Run workflow**, ou pousser sur la branche `main`.
3. L’application est en ligne à l’adresse : `https://sakalyyounes-commits.github.io/Footy/`

Ensuite, chaque modification poussée sur `main` est mise en ligne automatiquement. L’application utilise des chemins relatifs : elle continue de fonctionner si le dépôt est renommé.

## L’installer sur le téléphone

- **iPhone** : ouvrir le lien dans Safari → bouton **Partager** → **Sur l’écran d’accueil**.
- **Android** : ouvrir le lien dans Chrome → menu **⋮** → **Installer l’application**.

Une fois installée, elle s’ouvre en plein écran, fonctionne sans Internet et se met à jour toute seule.

## Mes données

- Tout est enregistré **localement** dans le navigateur (aucune donnée personnelle dans ce dépôt ni sur un serveur).
- Chaque appareil a ses propres données : utilisez **Réglages → Mes données → Exporter une sauvegarde** puis **Importer** pour transférer vers un autre appareil.
- Faites une sauvegarde régulièrement (un rappel s’affiche après 30 jours) : vider les données du navigateur efface l’application.
- Les transactions peuvent être exportées en CSV (compatible Excel).

## Horaires de prière

La méthode **Maroc — ministère des Habous** utilise Fajr 19° et Icha 17°, avec les décalages de précaution du calendrier officiel (Chourouk −3 min, Dhohr et Maghrib +5 min environ). Elle a été calibrée sur les horaires officiels publiés pour Casablanca et Rabat, et les tests automatiques vérifient un écart d’au plus 1 minute.

Dans **Réglages → Horaires de prière** : ville (ou position GPS), autre méthode de calcul (Ligue islamique mondiale, UOIF, Umm al-Qura…), Asr hanafite, ajustements minute par minute pour s’aligner sur sa mosquée, décalage du calendrier hégirien.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm run dev        # serveur de développement sur http://localhost:5173
npm test           # tests unitaires (Vitest)
npm run build      # vérification des types + version de production dans dist/
npm run preview    # prévisualiser la version de production
```

Technologies : React 19, TypeScript, Vite, Zustand (état + sauvegarde locale), [adhan](https://github.com/batoulapps/adhan-js) (calcul astronomique des prières), vite-plugin-pwa (hors connexion).

### Organisation du code

```
src/
  app/          navigation, mise en page, thème
  components/   composants d’interface (cartes, fenêtres, jauges) et graphiques
  data/         données de référence : aliments, villes, catégories, sports, adhkar
  lib/          logique pure et testée : dates, prières, calendrier hégirien, santé, finances, séries
  modules/      un dossier par module (pages, formulaires, actions)
  store/        état global, valeurs par défaut, migrations, sauvegardes
```

### Personnaliser

- Aliments : `src/data/foods.ts` · Villes : `src/data/cities.ts` · Catégories de dépenses : `src/data/categories.ts`
- Couleurs et thème clair / sombre : `src/styles.css`

## Limites connues

- Pas de synchronisation automatique entre appareils (export / import manuel).
- Pas de notifications (adhan, rappels d’eau) quand l’application est fermée : cela nécessiterait un serveur d’envoi de notifications.
- Les valeurs nutritionnelles, les calories dépensées et le calcul de zakat sont indicatifs.

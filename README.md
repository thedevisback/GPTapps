# Forge Fitness

Application de suivi de musculation mobile-first, pensée pour être utilisée pendant une séance depuis un iPhone.

## Fonctionnalités du MVP

- Catalogue d'exercices personnalisable
- Création de séances à partir du catalogue
- Paramétrage des séries et répétitions cibles
- Saisie des charges et répétitions série par série
- Validation des séries pendant l'entraînement
- Historique des séances
- Suivi du volume et des meilleures charges par semaine
- Sauvegarde locale sur l'appareil
- Export et import des données en JSON
- Manifest PWA pour installation sur l'écran d'accueil

## Démarrage local

```bash
npm install
npm run dev
```

Ouvrir ensuite `http://localhost:3000`.

## Déploiement

Le projet est compatible avec Vercel. Importer ce dépôt dans Vercel puis lancer le déploiement.

## Données

Cette première version stocke les données dans `localStorage`. Elles restent donc sur le navigateur utilisé. Utiliser l'export JSON pour effectuer des sauvegardes régulières.

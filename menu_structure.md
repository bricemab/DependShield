# 🧭 Structure du Menu (Proposition)

Pour enrichir la navigation et l'expérience utilisateur de **DependShield**, voici la nouvelle structure de menu proposée :

## 1. 📊 Dashboard (Accueil)
*   **Route** : `/dashboard` (ou `/`)
*   **Icône** : `LayoutDashboard`
*   **Contenu** :
    *   Vue d'ensemble "Hélicoptère".
    *   Score de sécurité global.
    *   Top risques.
    *   Activité récente.

## 2. 📁 Projects (Existant)
*   **Route** : `/projects`
*   **Icône** : `FolderGit2`
*   **Contenu** :
    *   Liste des projets.
    *   État des scans.
    *   Ajout de nouveau projet.

## 3. 🛡️ Vulnerabilities (Global)
*   **Route** : `/vulnerabilities`
*   **Icône** : `ShieldAlert`
*   **Contenu** :
    *   Liste globale des CVEs détectées.
    *   Recherche transversale (ex: "log4j").
    *   Filtres par sévérité.

## 4. ⚙️ Settings
*   **Route** : `/settings`
*   **Icône** : `Settings`
*   **Sous-menus** :
    *   **Profile** : Infos utilisateur.
    *   **Organization** : Membres, Rôles.
    *   **Integrations** : GitHub, Slack, JIRA.
    *   **Billing** : Abonnements, Factures.

## 5. 📚 Documentation
*   **Lien externe** : `https://docs.dependshield.io` (Exemple)
*   **Icône** : `BookOpen`

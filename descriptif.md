# 📋 Descriptif Complet des Fonctionnalités - DependShield

**DependShield** est une plateforme SaaS de surveillance et d'analyse de vulnérabilités pour les dépendances de vos projets. Cette documentation présente toutes les fonctionnalités accessibles aux utilisateurs, organisées par catégorie.

---

## 🔐 1. Authentification et Gestion de Compte

### Connexion via GitHub OAuth
- **Connexion simplifiée** : Authentification sécurisée via votre compte GitHub
- **Pas de mot de passe** : Utilisation du système OAuth de GitHub pour une connexion rapide et sécurisée
- **Gestion automatique du profil** : Vos informations GitHub sont automatiquement synchronisées

### Gestion du Profil
- **Consultation du profil** : Accès à vos informations utilisateur (nom, email, plan d'abonnement)
- **Visualisation du plan actif** : Affichage de votre plan actuel (STARTER, PRO ou ENTERPRISE)

---

## 📊 2. Tableau de Bord (Dashboard)

### Vue d'Ensemble
- **Statistiques globales** : Nombre total de projets surveillés
- **Indicateurs visuels** : Cartes affichant les métriques clés de votre organisation
- **Navigation rapide** : Accès direct à toutes les sections de l'application

### Informations Affichées
- **Total des projets** : Nombre de projets configurés avec évolution mensuelle
- **Graphiques à venir** : Zone réservée pour les futures visualisations de données

---

## 🗂️ 3. Gestion des Projets

### Liste des Projets

#### Affichage
- **Vue en grille** : Présentation visuelle de tous vos projets sous forme de cartes
- **Informations par projet** :
  - Nom du projet
  - Nom du dépôt GitHub (format `propriétaire/dépôt`)
  - Branche surveillée
  - Gestionnaire de paquets utilisé (npm, yarn, pnpm, bun)
  - Statut des notifications email (activées/désactivées)

#### Actions Disponibles
- **Créer un nouveau projet** : Bouton d'action principal pour ajouter un projet
- **Consulter les détails** : Clic sur une carte pour accéder aux détails du projet
- **Supprimer un projet** : Bouton de suppression avec confirmation

#### États d'Affichage
- **État vide** : Message d'accueil avec incitation à créer le premier projet
- **État de chargement** : Indicateur visuel pendant le chargement des données
- **Recherche et filtrage** : Barre de recherche pour filtrer les projets

### Création de Projet (Processus en 4 Étapes)

#### Étape 1 : Sélection du Dépôt
- **Liste des dépôts GitHub** : Affichage de tous vos dépôts accessibles
- **Recherche de dépôt** : Barre de recherche pour filtrer rapidement
- **Distinction Public/Privé** :
  - Icône de cadenas pour les dépôts privés
  - Icône de globe pour les dépôts publics
  - **Badge PRO** : Les dépôts privés nécessitent un plan PRO ou ENTERPRISE
- **Tri alphabétique** : Liste organisée par ordre alphabétique

#### Étape 2 : Sélection de la Branche
- **Liste des branches** : Affichage de toutes les branches du dépôt sélectionné
- **Recherche de branche** : Filtrage rapide des branches
- **Indicateur de protection** : Badge "Protected" pour les branches protégées
- **Tri alphabétique** : Branches organisées alphabétiquement

#### Étape 3 : Détection et Sélection du Lockfile
- **Détection automatique** : Le système analyse le dépôt et détecte automatiquement les fichiers de verrouillage (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb)
- **Support Monorepo** :
  - Détection des lockfiles dans les sous-répertoires
  - **Badge PRO** : Les lockfiles imbriqués (monorepos) nécessitent un plan PRO ou ENTERPRISE
- **Identification du gestionnaire** : Affichage automatique du gestionnaire de paquets détecté
- **Configuration manuelle** : Option pour configurer manuellement si aucun lockfile n'est détecté

#### Étape 4 : Configuration du Projet
- **Nom du projet** : Personnalisation du nom (pré-rempli avec le nom du dépôt)
- **Chemin du lockfile** : Spécification du chemin relatif du fichier de verrouillage
- **Gestionnaire de paquets** : Sélection parmi npm, yarn, pnpm, bun
- **Planification des scans** :
  - Configuration d'une expression cron pour les scans automatiques
  - Aperçu en langage naturel de la planification (ex: "Tous les jours à minuit")
  - Support multilingue de la description
- **Notifications email** :
  - Case à cocher pour activer les notifications
  - **Badge PRO** : Fonctionnalité réservée aux plans PRO et ENTERPRISE

#### Navigation
- **Progression visuelle** : Indicateur de progression avec 4 étapes numérotées
- **Navigation arrière** : Possibilité de revenir aux étapes précédentes
- **Validation** : Bouton de création final après configuration

### Détails d'un Projet

#### Onglets de Navigation
Le détail d'un projet est organisé en 6 onglets principaux :

##### 1. Overview (Vue d'Ensemble)

**Métriques Clés** (4 cartes principales)
- **Total des Scans** : Nombre total de scans effectués avec évolution hebdomadaire
- **Score de Sécurité** : Note sur 100 avec code couleur (vert ≥90, bleu ≥70, jaune ≥50, rouge <50)
- **Estimation de Remédiation** : Temps estimé pour corriger toutes les vulnérabilités (en jours et heures)
- **Informations du Dépôt** : Nom du dépôt, branche, gestionnaire de paquets

**Top Offenders (Paquets Problématiques)**
- **Liste des 5 paquets** avec le plus de vulnérabilités
- **Compteurs par sévérité** : Nombre de vulnérabilités critiques et élevées par paquet
- **Tri automatique** : Classement par score de dangerosité

**Distribution des Vulnérabilités**
- **Graphique en barre empilée** : Visualisation proportionnelle des vulnérabilités par sévérité
- **Légende détaillée** : Compteurs pour chaque niveau (Critical, High, Moderate, Low)
- **Code couleur** : Rouge (Critical), Orange (High), Jaune (Moderate), Bleu (Low)

**Activité Récente**
- **Liste des 5 derniers scans** avec :
  - Numéro du scan
  - Date et heure
  - Statut (completed, running, failed)
  - Lien vers les détails du scan
- **Indicateur de chargement** : Animation pour les scans en cours

##### 2. Scan History (Historique des Scans)

**Tableau des Scans**
- **Colonnes affichées** :
  - ID du scan
  - Statut avec badge coloré et animation pour les scans en cours
  - Nombre de vulnérabilités détectées
  - Score obtenu (sur 100)
  - Date et heure de démarrage
  - Bouton d'action "Details"

**Pagination**
- **Navigation par page** : Boutons Précédent/Suivant
- **Informations de pagination** : "Page X sur Y"
- **Nombre d'éléments par page** : Configurable (par défaut 10)

**États d'Affichage**
- **État vide** : Message d'invitation à lancer le premier scan
- **État de chargement** : Overlay avec spinner pendant le chargement
- **Mise à jour automatique** : Rafraîchissement toutes les 5 secondes si un scan est en cours

##### 3. Ignored Vulnerabilities (Vulnérabilités Ignorées)

**Liste des Règles d'Ignorance**
- **Affichage par règle** :
  - Nom du paquet concerné
  - CVE (si disponible)
  - Raison de l'ignorance (optionnelle)
  - Date de création de la règle
  - Nom de l'utilisateur ayant créé la règle

**Actions**
- **Supprimer une règle** : Bouton de suppression avec confirmation
- **État vide** : Message si aucune vulnérabilité n'est ignorée

**Badge de Compteur**
- **Indicateur dans l'onglet** : Nombre de vulnérabilités ignorées affiché dans le titre de l'onglet

##### 4. Configuration

**Planification des Scans**
- **Presets rapides** :
  - Quotidien (0 0 * * *)
  - Hebdomadaire (0 0 * * 0)
  - Personnalisé
- **Expression cron** : Champ de saisie avec validation
- **Aperçu en temps réel** : Description en langage naturel de la planification

**Notifications**
- **Email** : Case à cocher pour activer/désactiver les notifications par email

**Quality Gate (Porte de Qualité)**
- **Score minimum** : Définition d'un seuil de score acceptable
- **Sévérité d'échec** : Niveau de sévérité qui fait échouer le scan

**Bouton de Sauvegarde**
- **Enregistrement** : Bouton pour sauvegarder les modifications
- **Feedback visuel** : Toast de confirmation ou d'erreur

**Danger Zone (Zone Dangereuse)**
- **Suppression du projet** :
  - Champ de confirmation (saisir le nom du projet)
  - Double confirmation (popup)
  - Suppression définitive avec redirection

##### 5. Webhooks

**Liste des Webhooks**
- **Affichage par webhook** :
  - URL de destination
  - Type (SLACK, TEAMS, CUSTOM)
  - Événements écoutés (scan.completed, scan.failed)
  - Statut (actif/inactif)

**Création de Webhook**
- **Formulaire** :
  - URL du webhook
  - Type de webhook (sélection)
  - Événements à surveiller (cases à cocher)
  - Statut actif par défaut

**Actions**
- **Supprimer un webhook** : Bouton de suppression avec confirmation
- **Restriction de plan** : Fonctionnalité réservée aux plans PRO et ENTERPRISE

##### 6. Activity (Journal d'Activité)

**Logs d'Audit**
- **Affichage chronologique** des actions effectuées sur le projet :
  - Type d'action (création, modification, suppression, scan)
  - Utilisateur ayant effectué l'action
  - Date et heure
  - Détails de l'action

**Filtrage et Recherche**
- **Recherche par action** : Filtrage des logs par type d'action
- **Tri chronologique** : Du plus récent au plus ancien

#### Actions Globales
- **Bouton "Run Scan"** : Lancement manuel d'un scan de vulnérabilités
  - Disponible dans l'en-tête de tous les onglets
  - Désactivé pendant l'exécution d'un scan
  - Animation de chargement pendant le scan
  - Respect du cooldown (limitation de fréquence)

---

## 🔍 4. Scans de Vulnérabilités

### Déclenchement de Scan

#### Scan Manuel
- **Bouton "Run Scan"** : Disponible dans la vue détail du projet
- **Cooldown** : Protection contre les scans trop fréquents
  - Plan STARTER : 1 heure entre chaque scan
  - Plan PRO : 15 minutes entre chaque scan
  - Plan ENTERPRISE : Pas de limitation
- **Feedback immédiat** : Toast de confirmation ou d'erreur

#### Scan Automatique (Planifié)
- **Configuration cron** : Définition d'une planification personnalisée
- **Exécution en arrière-plan** : Les scans planifiés s'exécutent automatiquement
- **Notification** : Email envoyé à la fin du scan (si activé)

### Détails d'un Scan

#### En-tête
- **Numéro du scan** : Identifiant unique
- **Badge de statut** :
  - "Running" (bleu) : Scan en cours
  - "Failed" (rouge) : Scan échoué
- **Date et heure** : Horodatage du scan
- **Score global** : Note sur 100

#### Statistiques de Vulnérabilités

**Cartes de Compteurs** (4 cartes avec code couleur)
- **Critical** : Fond rouge, compteur de vulnérabilités critiques
- **High** : Fond orange, compteur de vulnérabilités élevées
- **Moderate** : Fond jaune, compteur de vulnérabilités modérées
- **Low** : Fond bleu, compteur de vulnérabilités faibles

#### Filtres et Recherche

**Barre de Recherche**
- **Recherche par nom de paquet** : Filtrage en temps réel

**Filtre par Sévérité**
- **Menu déroulant** : All Severities, Critical, High, Moderate, Low
- **Tri automatique** : Les vulnérabilités sont triées par sévérité décroissante

**Affichage des Ignorées**
- **Case à cocher** : "Show Ignored" pour afficher/masquer les vulnérabilités ignorées
- **Opacité réduite** : Les vulnérabilités ignorées sont affichées en grisé

#### Tableau des Vulnérabilités

**Colonnes**
1. **Severity** : Badge coloré avec le niveau de sévérité
2. **Package** : 
   - Nom du paquet
   - Version affectée
   - Badge "DEV" si c'est une dépendance de développement
3. **Vulnerability** :
   - Titre de la vulnérabilité
   - Code CVE (si disponible)
   - Lien vers l'advisory (ouverture dans un nouvel onglet)
4. **Status** :
   - Badge "Active" (vert) : Vulnérabilité non ignorée
   - Badge "Ignored" (gris) : Vulnérabilité ignorée
5. **Actions** :
   - Bouton "Ignorer" (icône œil barré) : Pour ignorer la vulnérabilité
   - Bouton "Réactiver" (icône œil) : Pour réactiver une vulnérabilité ignorée
   - **Badge PRO** : Icône couronne si la fonctionnalité nécessite un plan PRO

#### Gestion des Vulnérabilités Ignorées

**Modal d'Ignorance**
- **Affichage du paquet** : Nom et CVE de la vulnérabilité
- **Champ de raison** : Zone de texte optionnelle pour justifier l'ignorance
- **Boutons d'action** :
  - "Cancel" : Annuler l'action
  - "Confirm & Ignore" : Confirmer l'ignorance

**Réactivation**
- **Confirmation simple** : Popup de confirmation
- **Suppression de la règle** : La vulnérabilité redevient active

#### Export de Rapports

**Boutons d'Export**
- **Export PDF** : Génération d'un rapport PDF téléchargeable
- **Export CSV** : Génération d'un fichier CSV avec toutes les vulnérabilités

**Contenu des Rapports**
- Liste complète des vulnérabilités
- Informations du projet
- Score et statistiques
- Date de génération

#### Mise à Jour en Temps Réel

**Polling Automatique**
- **Rafraîchissement** : Toutes les 5 secondes pendant qu'un scan est en cours
- **Arrêt automatique** : Le polling s'arrête quand le scan est terminé ou échoué
- **Indicateur de mise à jour** : Date et heure de la dernière mise à jour affichées

---

## 📧 5. Notifications

### Notifications Email

#### Configuration
- **Activation par projet** : Case à cocher dans la configuration du projet
- **Restriction de plan** : Fonctionnalité réservée aux plans PRO et ENTERPRISE

#### Événements Notifiés
- **Fin de scan** : Email envoyé à la fin de chaque scan
- **Contenu de l'email** :
  - Nom du projet
  - Score obtenu
  - Nombre de vulnérabilités par sévérité
  - Lien vers les détails du scan

#### Gestion
- **Activation/Désactivation** : Depuis l'onglet Configuration du projet
- **Pas de configuration d'adresse** : Utilise l'email du compte GitHub

---

## 🔔 6. Webhooks

### Configuration des Webhooks

#### Création
- **URL de destination** : Saisie de l'URL du webhook
- **Type de webhook** :
  - SLACK : Format compatible Slack
  - TEAMS : Format compatible Microsoft Teams
  - CUSTOM : Format JSON personnalisé
- **Événements** : Sélection des événements à surveiller
  - scan.completed : Fin de scan réussie
  - scan.failed : Échec de scan
- **Statut** : Activation/désactivation du webhook

#### Gestion
- **Liste des webhooks** : Affichage de tous les webhooks configurés
- **Suppression** : Bouton de suppression avec confirmation
- **Restriction de plan** : Fonctionnalité réservée aux plans PRO et ENTERPRISE

#### Payload
- **Format JSON** : Données structurées envoyées au webhook
- **Informations incluses** :
  - ID du projet
  - Nom du projet
  - Type d'événement
  - Score du scan
  - Nombre de vulnérabilités
  - Lien vers les détails

---

## 🎨 7. Interface Utilisateur

### Thème

#### Mode Sombre/Clair
- **Bouton de bascule** : Icône soleil/lune dans la barre latérale
- **Persistance** : Le choix est sauvegardé localement
- **Application globale** : Tous les composants s'adaptent automatiquement

### Internationalisation

#### Langues Disponibles
- **Français** : Langue par défaut
- **Anglais** : Traduction complète
- **Sélecteur de langue** : Menu déroulant dans la barre latérale

#### Éléments Traduits
- **Interface complète** : Tous les textes de l'interface
- **Messages d'erreur** : Feedback utilisateur traduit
- **Descriptions cron** : Planifications en langage naturel dans la langue sélectionnée

### Navigation

#### Barre Latérale
- **Menu principal** :
  - Dashboard : Vue d'ensemble
  - Projects : Liste des projets
  - Vulnerabilities : Vue globale (à venir)
  - Settings : Paramètres (à venir)
- **Informations utilisateur** :
  - Avatar GitHub
  - Nom d'utilisateur
  - Plan actif
- **Boutons d'action** :
  - Sélecteur de langue
  - Bascule de thème
  - Déconnexion

#### Fil d'Ariane
- **Navigation contextuelle** : Bouton "Retour" avec indication de la page précédente
- **Hiérarchie claire** : Affichage du chemin de navigation

### Composants Visuels

#### Cartes (Cards)
- **Design moderne** : Bordures arrondies, ombres subtiles
- **Hover effects** : Changement de couleur de bordure au survol
- **Responsive** : Adaptation automatique à la taille de l'écran

#### Badges
- **Codes couleur** : Distinction visuelle par type (statut, sévérité, plan)
- **Icônes** : Pictogrammes pour une identification rapide
- **Animations** : Spinner pour les états de chargement

#### Toasts (Notifications)
- **Position** : Coin supérieur droit
- **Types** :
  - Success (vert) : Action réussie
  - Error (rouge) : Erreur
  - Info (bleu) : Information
- **Fermeture automatique** : Disparition après quelques secondes

#### Modales (Dialogs)
- **Overlay** : Fond assombri
- **Centrage** : Positionnement au centre de l'écran
- **Actions** : Boutons Cancel et Confirm
- **Fermeture** : Clic en dehors ou bouton de fermeture

---

## 💎 8. Plans et Restrictions

### Plan STARTER (Gratuit)

#### Fonctionnalités Incluses
- ✅ Scans de vulnérabilités illimités (manuels)
- ✅ Support des dépôts **publics** uniquement
- ✅ Tableau de bord basique
- ✅ Détail des vulnérabilités
- ✅ Historique du dernier scan

#### Limitations
- ❌ Maximum **3 projets**
- ❌ **1 utilisateur** (admin)
- ❌ Cooldown de **1 heure** entre les scans
- ❌ Pas de notifications email
- ❌ Pas de support des dépôts privés
- ❌ Pas de support monorepo
- ❌ Pas de webhooks
- ❌ Pas de gestion des vulnérabilités ignorées

### Plan PRO (29€/mois)

#### Fonctionnalités Incluses
- ✅ **Toutes les fonctionnalités STARTER**
- ✅ Support des dépôts **privés**
- ✅ **Support Monorepo** complet (lockfiles imbriqués)
- ✅ **Notifications Email** en temps réel
- ✅ **Gestion des Whitelists** (ignorer les vulnérabilités)
- ✅ **Webhooks** (Slack, Teams, Custom)
- ✅ Historique des scans (30 jours)
- ✅ Cooldown réduit à **15 minutes**

#### Limitations
- ❌ Maximum **20 projets**
- ❌ Maximum **5 utilisateurs**
- ❌ Scans planifiés quotidiens uniquement

### Plan ENTERPRISE (Sur devis)

#### Fonctionnalités Incluses
- ✅ **Toutes les fonctionnalités PRO**
- ✅ **Projets illimités**
- ✅ **Utilisateurs illimités**
- ✅ **Pas de cooldown** (infrastructure dédiée)
- ✅ Historique illimité (audit logs)
- ✅ **API Access** pour intégration CI/CD
- ✅ Support prioritaire (SLA)
- ✅ SSO / SAML (à venir)
- ✅ Rôles & Permissions (RBAC) (à venir)

#### Avantages
- 🎯 Infrastructure dédiée/isolée
- 🎯 Support technique prioritaire
- 🎯 Personnalisation possible

### Indicateurs Visuels de Plan

#### Badges PRO
- **Icône couronne** : Affichée sur les fonctionnalités PRO/ENTERPRISE
- **Couleur ambre** : Fond jaune/orange pour attirer l'attention
- **Tooltips** : Message "Upgrade to PRO" au survol

#### Restrictions Actives
- **Désactivation visuelle** : Opacité réduite pour les fonctionnalités inaccessibles
- **Curseur interdit** : Indication que l'action n'est pas disponible
- **Messages informatifs** : Toast expliquant la restriction et invitant à upgrader

---

## 📈 9. Analytiques et Métriques

### Scores de Sécurité

#### Calcul du Score
- **Base 100** : Score sur 100 points
- **Pénalités par sévérité** :
  - Critical : -10 points par vulnérabilité
  - High : -5 points par vulnérabilité
  - Moderate : -2 points par vulnérabilité
  - Low : -1 point par vulnérabilité

#### Affichage
- **Code couleur** :
  - Vert (≥90) : Excellent
  - Bleu (≥70) : Bon
  - Jaune (≥50) : Moyen
  - Rouge (<50) : Critique
- **Évolution** : Comparaison avec le scan précédent (à venir)

### Estimation de Remédiation

#### Calcul
- **Temps par sévérité** :
  - Critical : 8 heures (1 jour)
  - High : 4 heures
  - Moderate : 1 heure
  - Low : 0.5 heure

#### Affichage
- **Format lisible** : "Xd Yh" (jours et heures)
- **Carte dédiée** : Dans la vue Overview du projet

### Top Offenders

#### Identification
- **Score de dangerosité** : Calcul basé sur le nombre et la sévérité des vulnérabilités
- **Top 5** : Affichage des 5 paquets les plus problématiques

#### Affichage
- **Nom du paquet** : Nom complet avec troncature si nécessaire
- **Compteurs** : Nombre de vulnérabilités Critical et High
- **Badges colorés** : Rouge pour Critical, Orange pour High

---

## 🔒 10. Sécurité et Conformité

### Audit Logs

#### Enregistrement
- **Actions tracées** :
  - Création de projet
  - Modification de projet
  - Suppression de projet
  - Lancement de scan
  - Création/suppression de webhook
  - Création/suppression de règle d'ignorance

#### Consultation
- **Onglet Activity** : Dans les détails du projet
- **Informations affichées** :
  - Type d'action
  - Utilisateur
  - Date et heure
  - Détails de l'action

### Gestion des Vulnérabilités Ignorées

#### Whitelist
- **Création de règle** : Depuis le détail d'un scan
- **Raison optionnelle** : Justification de l'ignorance
- **Traçabilité** : Enregistrement de l'utilisateur et de la date

#### Effets
- **Exclusion des compteurs** : Les vulnérabilités ignorées ne comptent pas dans les statistiques
- **Affichage distinct** : Opacité réduite dans les tableaux
- **Réversibilité** : Possibilité de réactiver une vulnérabilité

---

## 📤 11. Exports et Rapports

### Export PDF

#### Contenu
- **En-tête** : Informations du projet et du scan
- **Statistiques** : Score et compteurs par sévérité
- **Liste des vulnérabilités** : Tableau détaillé
- **Métadonnées** : Date de génération, utilisateur

#### Génération
- **Bouton "Export PDF"** : Dans le détail d'un scan
- **Téléchargement automatique** : Fichier PDF téléchargé directement
- **Nom du fichier** : `report-{projectId}.pdf`

### Export CSV

#### Contenu
- **Format tabulaire** : Colonnes séparées par des virgules
- **Données incluses** :
  - Nom du paquet
  - Version
  - Sévérité
  - CVE
  - Titre de la vulnérabilité
  - URL de l'advisory

#### Génération
- **Bouton "Export CSV"** : Dans le détail d'un scan
- **Téléchargement automatique** : Fichier CSV téléchargé directement
- **Nom du fichier** : `report-{projectId}.csv`

---

## 🎯 12. Badges de Projet

### Badge de Sécurité

#### Génération
- **URL publique** : `/projects/{id}/badge`
- **Format SVG** : Image vectorielle évolutive
- **Pas d'authentification** : Accessible publiquement

#### Affichage
- **Nom** : "DependShield"
- **Score** : "X/100"
- **Code couleur** :
  - Vert (≥80) : Bon score
  - Jaune (50-79) : Score moyen
  - Rouge (<50) : Score faible

#### Utilisation
- **README GitHub** : Intégration dans le fichier README.md
- **Documentation** : Affichage dans la documentation du projet
- **Site web** : Intégration sur un site web

---

## 🔄 13. Intégrations

### GitHub

#### Connexion
- **OAuth** : Authentification via GitHub
- **Permissions** : Accès en lecture aux dépôts
- **Synchronisation** : Liste des dépôts mise à jour automatiquement

#### Accès aux Données
- **Dépôts** : Liste de tous les dépôts accessibles
- **Branches** : Liste des branches par dépôt
- **Fichiers** : Lecture des lockfiles pour détection automatique

### Gestionnaires de Paquets

#### Support
- **npm** : package-lock.json
- **yarn** : yarn.lock
- **pnpm** : pnpm-lock.yaml
- **bun** : bun.lockb

#### Détection Automatique
- **Analyse du dépôt** : Recherche automatique des fichiers de verrouillage
- **Identification** : Détermination automatique du gestionnaire de paquets
- **Monorepo** : Détection des lockfiles dans les sous-répertoires (PRO)

---

## ⚙️ 14. Fonctionnalités Techniques (Visibles par l'Utilisateur)

### Cooldown de Scan

#### Objectif
- **Protection** : Éviter la surcharge du système
- **Limitation de fréquence** : Temps minimum entre deux scans

#### Comportement
- **Message d'erreur** : Toast informatif si le cooldown n'est pas respecté
- **Indication du temps restant** : Affichage du temps d'attente (à venir)

### Mise à Jour Automatique

#### Polling
- **Scans en cours** : Rafraîchissement automatique toutes les 5 secondes
- **Arrêt automatique** : Quand le scan est terminé
- **Indicateur visuel** : Animation de chargement

#### Temps Réel
- **Statut du scan** : Mise à jour en temps réel
- **Compteurs** : Actualisation des statistiques
- **Liste des vulnérabilités** : Ajout progressif des vulnérabilités détectées

### Pagination

#### Liste des Scans
- **Nombre par page** : 10 scans par page
- **Navigation** : Boutons Précédent/Suivant
- **Informations** : "Page X sur Y"

#### Optimisation
- **Chargement partiel** : Seules les données de la page actuelle sont chargées
- **Performance** : Réduction du temps de chargement

---

## 🎨 15. Expérience Utilisateur

### États de Chargement

#### Spinners
- **Chargement global** : Spinner plein écran lors du chargement initial
- **Chargement partiel** : Spinner dans les cartes/tableaux
- **Boutons** : Spinner dans les boutons pendant l'action

#### Skeletons
- **Cartes** : Placeholder animé pendant le chargement
- **Tableaux** : Lignes de placeholder

### Messages d'Erreur

#### Types
- **Erreur de connexion** : Problème d'authentification
- **Erreur de chargement** : Impossible de charger les données
- **Erreur d'action** : Échec d'une action (création, suppression, etc.)
- **Erreur de validation** : Données invalides

#### Affichage
- **Toast** : Notification en haut à droite
- **Couleur rouge** : Indication visuelle d'erreur
- **Message descriptif** : Explication de l'erreur
- **Suggestion** : Action à effectuer pour résoudre (si applicable)

### Messages de Succès

#### Types
- **Action réussie** : Création, modification, suppression
- **Scan lancé** : Confirmation du lancement
- **Export réussi** : Rapport généré

#### Affichage
- **Toast** : Notification en haut à droite
- **Couleur verte** : Indication visuelle de succès
- **Message concis** : Confirmation de l'action

### États Vides

#### Aucun Projet
- **Icône** : Dossier vide
- **Message** : "No projects yet"
- **Action** : Bouton "Create New Project"

#### Aucun Scan
- **Icône** : Document vide
- **Message** : "No scans yet"
- **Action** : Bouton "Run First Scan"

#### Aucune Vulnérabilité
- **Icône** : Bouclier
- **Message** : "No vulnerabilities found"
- **Félicitations** : "Good job!"

---

## 📱 16. Responsive Design

### Adaptation Mobile

#### Navigation
- **Menu hamburger** : Barre latérale rétractable sur mobile
- **Navigation simplifiée** : Menu adapté aux petits écrans

#### Grilles
- **1 colonne** : Sur mobile (< 768px)
- **2 colonnes** : Sur tablette (768px - 1024px)
- **3-4 colonnes** : Sur desktop (> 1024px)

#### Tableaux
- **Scroll horizontal** : Sur mobile pour les tableaux larges
- **Colonnes prioritaires** : Affichage des colonnes essentielles en premier

#### Cartes
- **Pleine largeur** : Sur mobile
- **Espacement adapté** : Marges réduites sur mobile

---

## 🔮 17. Fonctionnalités Annoncées (À Venir)

### Vue Globale des Vulnérabilités
- **Page dédiée** : Agrégation de toutes les vulnérabilités de tous les projets
- **Filtres avancés** : Par sévérité, paquet, projet
- **Statistiques globales** : Vue d'ensemble de la sécurité de l'organisation

### Paramètres Utilisateur
- **Gestion du profil** : Modification des informations personnelles
- **Préférences** : Configuration des préférences d'affichage
- **Gestion de l'organisation** : Ajout/suppression d'utilisateurs (ENTERPRISE)
- **Facturation** : Gestion de l'abonnement et des paiements

### Graphiques et Visualisations
- **Tendances** : Évolution des scores dans le temps
- **Comparaisons** : Benchmark entre projets
- **Prédictions** : Estimation de l'évolution future

### SSO / SAML (ENTERPRISE)
- **Authentification d'entreprise** : Intégration avec les systèmes d'authentification existants
- **Single Sign-On** : Connexion unique pour tous les services

### RBAC (ENTERPRISE)
- **Rôles personnalisés** : Création de rôles avec permissions spécifiques
- **Gestion fine des accès** : Contrôle granulaire des permissions par utilisateur

---

## 📞 18. Support et Aide

### Documentation
- **Tooltips** : Aide contextuelle au survol des éléments
- **Messages d'information** : Explications dans les formulaires
- **Descriptions** : Textes explicatifs pour chaque fonctionnalité

### Feedback Utilisateur
- **Toasts** : Notifications pour chaque action
- **Messages d'erreur** : Explications claires des problèmes
- **Messages de succès** : Confirmations des actions réussies

### Contact
- **Support PRO** : Email de support pour les plans PRO
- **Support ENTERPRISE** : Support prioritaire avec SLA pour les plans ENTERPRISE

---

## 🎯 Résumé des Fonctionnalités Principales

### Pour Tous les Utilisateurs (STARTER)
1. ✅ Connexion via GitHub OAuth
2. ✅ Création de projets (dépôts publics)
3. ✅ Scans manuels de vulnérabilités
4. ✅ Visualisation des résultats
5. ✅ Tableau de bord avec métriques
6. ✅ Export de rapports (PDF/CSV)
7. ✅ Interface multilingue (FR/EN)
8. ✅ Mode sombre/clair

### Pour les Utilisateurs PRO
9. ✅ Dépôts privés
10. ✅ Support Monorepo
11. ✅ Notifications email
12. ✅ Gestion des vulnérabilités ignorées
13. ✅ Webhooks (Slack, Teams, Custom)
14. ✅ Historique des scans (30 jours)
15. ✅ Cooldown réduit (15 min)

### Pour les Utilisateurs ENTERPRISE
16. ✅ Projets et utilisateurs illimités
17. ✅ Pas de cooldown
18. ✅ Historique illimité
19. ✅ API Access
20. ✅ Support prioritaire
21. 🔜 SSO / SAML
22. 🔜 RBAC

---

**DependShield** offre une solution complète de surveillance de la sécurité des dépendances, avec une interface moderne et intuitive, adaptée à tous les types d'utilisateurs, des développeurs individuels aux grandes entreprises.

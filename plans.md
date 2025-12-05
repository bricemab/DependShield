# 💎 Stratégie de Monétisation & Analyse Produit - DependShield

En tant que Product Manager Senior, j'ai analysé le code source de **DependShield** pour identifier les leviers de valeur et construire une offre SaaS cohérente.

## 1. Analyse des Fonctionnalités (Assets Techniques) 📦

Voici l'inventaire des fonctionnalités actuelles et leur potentiel de monétisation :

| Fonctionnalité | Description Technique | Valeur Perçue | Coût Infrastructure |
| :--- | :--- | :--- | :--- |
| **Scan de Vulnérabilités** | Moteur basé sur `npm audit`, queue BullMQ/Redis. | **Critique** (Cœur du produit) | Élevé (CPU/RAM par scan) |
| **Support Monorepo** | Détection multiple lockfiles (`ProjectsService`). | **Haute** (Complexité gérée) | Moyen (Parsing plus long) |
| **Scan Planifié (Cron)** | Tâche planifiée (`cronSchedule`). | **Confort** (Automatisation) | Moyen (Charge récurrente) |
| **Notifications Email** | Service SMTP (`NotificationsModule`). | **Réactivité** (Alerting) | Faible (mais coût API mail) |
| **Gestion Whitelist** | Ignorer des CVEs (`VulnerabilityModule`). | **Productivité** (Moins de bruit) | Très faible (DB) |
| **Rate Limiting** | Cooldown de 1h (`ScansService`). | **Stabilité** | N/A (Économie de ressources) |
| **Historique & Scores** | Stockage des scans passés. | **Audit/Compliance** | Moyen (Stockage DB) |
| **Support Git** | GitHub (et abstraction prête). | **Intégration** | Faible |

---

## 2. Plans Tarifaires (Pricing Model) 🏷️

Voici la structure recommandée pour maximiser la conversion (Freemium) et le revenu (Upsell).

### 🌱 PLAN STARTER (Gratuit)
*Pour les développeurs individuels et l'Open Source.*

*   **Prix** : **0 € / mois**
*   **Fonctionnalités incluses** :
    *   Scans de vulnérabilités illimités (manuels).
    *   Support des repositories **Publics** uniquement.
    *   Tableau de bord basique (Dernier scan).
    *   Détail des vulnérabilités.
*   **Limites (Quotas)** :
    *   **3 Projets** maximum.
    *   **1 Utilisateur** (Admin).
    *   **Cooldown de scan** : 1 heure (Pas de "Scan Immédiat").
    *   Pas d'historique (seulement le dernier état).
    *   Pas de notifications email.

### 🚀 PLAN PRO (Team)
*Pour les startups et les petites équipes agiles.*

*   **Prix** : **29 € / mois** (ou 290€ / an)
*   **Fonctionnalités incluses** :
    *   Tout le plan Starter.
    *   Support des repositories **Privés**.
    *   **Support Monorepo** complet (Multi-lockfiles).
    *   **Notifications Email** en temps réel.
    *   Gestion des **Whitelists** (Ignorer les faux positifs).
    *   Historique des scans (30 jours).
*   **Limites (Quotas)** :
    *   **20 Projets**.
    *   **5 Utilisateurs**.
    *   **Cooldown réduit** : 15 minutes (Option `immediateScansEnabled` activée).
    *   Scans planifiés (Cron) quotidiens.

### 🏢 PLAN ENTERPRISE (Scale)
*Pour les grandes organisations avec des besoins de conformité.*

*   **Prix** : **Contactez-nous** (ou à partir de 199 € / mois)
*   **Fonctionnalités incluses** :
    *   Tout le plan Pro.
    *   **SSO / SAML** (À développer - voir `ameliorations.md`).
    *   **Rôles & Permissions (RBAC)** (À développer).
    *   **API Access** pour intégration CI/CD custom.
    *   **Webhooks** (Slack/Teams).
    *   Support Prioritaire (SLA).
*   **Limites (Quotas)** :
    *   **Projets Illimités**.
    *   **Utilisateurs Illimités**.
    *   **Pas de Cooldown** (Infrastructure dédiée/isolée).
    *   Historique illimité (Audit logs).

---

## 3. Justification de la Stratégie 🧠

### Pourquoi ces limites ?

1.  **Repositories Privés dans le plan Payant** : C'est le standard de l'industrie (GitHub, GitLab). Les entreprises ont du code privé et sont prêtes à payer pour le sécuriser. Le code public (Open Source) sert de produit d'appel.
2.  **Monorepo en Pro** : Les monorepos sont souvent utilisés par des équipes plus matures ou des projets complexes qui ont du budget. C'est une fonctionnalité "Pain Killer" qui justifie l'upgrade.
3.  **Cooldown (Rate Limiting)** :
    *   **Technique** : Protège votre infrastructure contre le spam de scans coûteux en CPU.
    *   **Psychologique** : La frustration d'attendre 1h incite à passer au plan Pro pour avoir le "Scan Immédiat" (`immediateScansEnabled` dans le code).
4.  **Notifications** : C'est une fonctionnalité de "confort" et de "réactivité" essentielle pour les équipes professionnelles, donc payante.
5.  **Historique** : Le stockage coûte cher. L'historique est surtout utile pour les audits de sécurité (besoin Enterprise/Pro).

### Recommandations Techniques pour supporter ce Pricing

*   **Backend** :
    *   Modifier `ProjectsService` pour vérifier le quota de projets avant création (`count({ where: { ownerId } })`).
    *   Modifier `ScansService` pour appliquer le cooldown dynamiquement en fonction du plan de l'utilisateur (actuellement booléen, passer à une config par plan).
    *   Ajouter un champ `plan` ou `subscriptionTier` dans l'entité `User` ou `Organization`.
*   **Frontend** :
    *   Griser les fonctionnalités Pro (ex: Toggle "Email Notifications") avec un tooltip "Upgrade to Pro".
    *   Afficher une jauge d'utilisation des projets (ex: "2/3 Projets utilisés").

# 📝 Todo / Future Ideas - DependShield

## 1. ⚙️ Settings (Paramètres)
Refonte du menu Settings pour centraliser la configuration.

*   **👤 My Profile (Profil)**
    *   **Infos** : Avatar, Nom, Email (Sync GitHub).
    *   **Préférences** : Thème (Light/Dark/System), Langue (EN/FR).

*   **🏢 Organization (Organisation)** *[Plan PRO/ENT]*
    *   **Team Members** : Liste des utilisateurs.
    *   **Rôles (RBAC)** : Admin, Editor, Viewer.
    *   **SSO** : Configuration SAML/OIDC.

*   **🔔 Notifications & Integrations**
    *   **Global Email Settings** : Toggle général.
    *   **Global Webhooks** : Webhooks transverses (tous les projets).
    *   **API Access** : Tokens personnels (PAT).

*   **💳 Billing (Facturation)**
    *   **Plan** : Indicateur (Starter/Pro/Ent).
    *   **Quotas** : Jauges d'utilisation (Projets, Scans, Membres).
    *   **Invoices** : Historique factures.

## 2. 🛡️ Vulnerabilities (Security Center)
Nouvelle vue transverse.

*   **🌎 Global Feed**
    *   Tableau agrégé de toutes les vulnérabilités de tous les projets.
    *   Priorisation globale.

*   **🔍 "Zero-Day" Search**
    *   Recherche par package (ex: `lodash`) sur tout le parc.
    *   Identification instantanée des versions installées et projets impactés.

*   **📜 Security Policies**
    *   Règles bloquantes globales (ex: "No Critical > 7 days").

*   **📊 Reporting Global**
    *   Export PDF/CSV au niveau Organisation.

## 3. Backend Enhancements
*   **Gestion des Entreprises (Organizations)** : 
    *   Création table `Organization`.
    *   Liaison Users <-> Organization.
    *   Refonte Login pour supporter ou créer une Org par défaut.

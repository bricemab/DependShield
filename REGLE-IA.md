# REGLE-IA.MD  
Fichier de référence interne pour l’IA  
(À lire au début de chaque session)

## 1. Règles générales
- Suivre strictement le prompt maître.
- Respecter Git Flow pour toute nouvelle fonctionnalité.
- Avant de coder, poser des questions uniquement si un point est bloquant ou ambigu.
- Produire du code maintenable, testable et flexible.
- Générer uniquement du code en accord avec la stack technique définie.
- Mettre à jour ce fichier dès que des décisions sont prises ou que le backlog évolue.

## 2. Décisions d’architecture

### Backend (NestJS)
- **Structure Modulaire** :
  - `ConfigModule` : Gestion centralisée (.env).
  - `DatabaseModule` : TypeORM + MySQL.
  - `AuthModule` : JWT + GitHub OAuth.
  - `UsersModule` : Gestion des utilisateurs.
  - `ProjectsModule` : Gestion des checkers (repositories, branches, config).
  - `ScansModule` : Logique de scan, queue (BullMQ), parsing lockfiles.
  - `VulnerabilityModule` : Gestion des whitelists et base de vulnérabilités.
  - `NotificationsModule` : Emails (SMTP).
- **Queueing** : BullMQ + Redis pour la gestion asynchrone des scans.

## 3. Backlog (Kanban)

### TODO
- [ ] Webhooks (Slack/Discord/Teams)

### DOING
- [ ] (Empty)

### ON HOLD
- [ ] Support GitLab / Bitbucket
- [ ] Tests E2E Frontend (Cypress)

### DONE
- [x] EPSS Score Integration (PRO/ENTERPRISE feature)
- [x] Feature A: Scan "Light" via API (Download lockfile only)
- [x] Feature B: GitHub Status Checks Integration
- [x] Feature C: Dev vs Runtime Dependency Distinction
- [x] Feature D: Secrets & Docker Scanning
- [x] Export des rapports (PDF, CSV)
- [x] UI Polish: Replace native alerts with Shadcn Sonner.
- [x] Gate Feature: Monorepo Support (Block non-root lockfiles for Starter).
- [x] Gate Feature: Whitelist Management (Block whitelist toggle for Starter).
- [x] Frontend: Visual gating for Whitelist toggle in Vulnerability Detail.
- [x] Enforce Scan Cooldowns (1h for Starter, 15m for Pro).
- [x] Gate Email Notifications (Pro+ only).
- [x] Frontend: Display Plan limits and gate features visually.
- [x] Abstraction du Provider Git (pour futur GitLab/Bitbucket).
- [x] Tests unitaires et E2E plus complets.
- [x] Initialiser le repository Git et la structure Git Flow (branches main, develop).
- [x] Bootstrap Frontend : Vue 3, Vite, Tailwind, Pinia, Router.
- [x] Configurer l'intégration GitHub OAuth (Backend & Frontend).
- [x] Bootstrap Backend : NestJS, TypeORM, MySQL, Config, Logger (Winston).
- [x] Créer le modèle de données User et Project (Checker).
- [x] Implémenter la logique de détection des lockfiles (Monorepo support).
- [x] Mettre en place le système de queue (BullMQ) pour les scans.
- [x] Implémenter le Dashboard (Liste des projets, Création, Détail).
- [x] Implémenter la logique de Scan (Queue processor, audit commands).
- [x] Gestion des vulnérabilités (Affichage, Whitelist Backend & Frontend).
- [x] Notifications Email (SMTP, Gmail support).
- [x] Auto-update des status de scan (Polling & UI).
- [x] Vérification de la connexion Redis au démarrage.
- [x] Implémenter l'internationalisation (i18n) FR/EN.
- [x] Pagination des scans (Backend & Frontend).

## 4. Notes importantes
- Ce fichier doit toujours rester court, clair et entièrement lisible par l’IA au début de chaque session.
- Ne doit jamais contenir d’explications longues : uniquement des décisions, règles et backlog.

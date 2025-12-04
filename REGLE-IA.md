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

### Frontend (Vue 3 + Vite)
- **Structure** :
  - `src/layouts` : Layouts (Dashboard, Auth).
  - `src/views` : Pages principales.
  - `src/components` : Composants UI (shadcn/ui).
  - `src/stores` : Pinia (AuthStore, ProjectStore, ScanStore).
  - `src/locales` : i18n (fr/en).
- **UI Library** : TailwindCSS + shadcn-vue.

## 3. Backlog (Kanban)

### TODO
*(Vide)*

### DOING
*(Vide)*

### DONE
- [x] Initialiser le repository Git et la structure Git Flow (branches main, develop).
- [x] Bootstrap Frontend : Vue 3, Vite, Tailwind, Pinia, i18n, Router.
- [x] Configurer l'intégration GitHub OAuth (Backend & Frontend).
- [x] Bootstrap Backend : NestJS, TypeORM, MySQL, Config, Logger (Winston).
- [x] Créer le modèle de données User et Project (Checker).
- [x] Implémenter la logique de détection des lockfiles.
- [x] Mettre en place le système de queue (BullMQ) pour les scans.

## 4. Notes importantes
- Ce fichier doit toujours rester court, clair et entièrement lisible par l’IA au début de chaque session.
- Ne doit jamais contenir d’explications longues : uniquement des décisions, règles et backlog.

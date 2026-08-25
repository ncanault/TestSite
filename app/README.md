# Evony Alliance Dashboard (SaaS)

Site complet (pas juste un dashboard statique) : page d'accueil, inscription/connexion,
création d'alliance gratuite, 3 abonnements payants (Basic / Alliance / Compétitif) et
les 3 pages de suivi correspondantes, avec un back-office admin pour associer les
joueurs à leur alliance et activer les abonnements.

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind CSS v4
- **Prisma** + **SQLite** (fichier local `prisma/dev.db`) — bascule vers PostgreSQL en
  changeant simplement `provider`/`url` dans `prisma/schema.prisma`
- Authentification maison (cookie de session signé, `jose` + `bcryptjs`) — pas de
  NextAuth, pour garder un contrôle total sur les rôles (Admin/Joueur) et le
  cloisonnement par alliance/abonnement
- **Recharts** pour les graphiques (bar charts par buff, courbes d'évolution)

## Démarrage

```bash
cp .env.example .env        # puis générer un vrai SESSION_SECRET (voir le fichier)
npm install
npx prisma migrate deploy   # crée prisma/dev.db
npx tsx prisma/seed.ts      # crée le compte admin (admin@sog669.local / changeme123)
npm run dev
```

**Important pour un vrai déploiement** : tant que le site n'est pas servi en HTTPS,
laissez `COOKIE_SECURE="false"` dans `.env` (sinon le navigateur rejette le cookie de
session). Passez-le à `"true"` uniquement une fois le HTTPS en place.

## Modèle de données

```
Server (1) ──< Alliance (1) ──< Account (N)
                  │                  │
                  │              AccountHistory (append-only)
                  1
                  │
                User (owner + membres)
```

- **`Account.gameId`** (`BigInt`) est la **clé primaire** — le numéro unique du compte
  dans Evony, pas un id interne généré. Un compte appartient à **une seule alliance à
  la fois, sur toute la plateforme** : réenregistrer un `gameId` déjà pris par une autre
  alliance est rejeté (`upsertAccountAction` dans `src/app/actions/account.ts`). Pas
  d'historique de changement d'alliance pour l'instant — un transfert se fait en
  supprimant le compte de l'ancienne alliance puis en le ressaisissant dans la nouvelle.
- **`Alliance`** est identifiée par un **trigramme** (`tag`, 3 caractères) + un **nom**,
  tous deux uniques par serveur (`@@unique([serverId, tag])` / `@@unique([serverId, name])`)
  — pas globalement, comme dans le jeu (le même trigramme peut exister sur 2 serveurs).
- **`Server`** est une vraie table (pas juste un champ texte) : plusieurs alliances
  peuvent partager un même serveur, et `Server.number` est unique.
- Voir `prisma/schema.prisma` pour le schéma complet et commenté.

## Modèle d'abonnement (cumulatif)

Les 3 tiers sont **cumulatifs** : Compétitif inclut Alliance, qui inclut Basic. C'est
une hypothèse de conception (le brief ne précisait pas explicitement ce point) — à
ajuster dans `src/lib/tier.ts` (`TIER_RANK`) si un modèle non cumulatif est préféré.

| Tier | Prix | Débloque |
|---|---|---|
| Basic | 5$ | Page **Team** : création d'alliance, saisie des comptes, historisation, tuiles récap |
| Alliance | 15$ | + Page **Alliance** : bar charts buffs attaque/défense par compte, courbes d'évolution dans le temps |
| Compétitif | 30$ | + Page **Compétitif** : sélection filtrée par puissance, Setter forcé/calculé, meilleure attaque/défense, Hive Composition (placement euclidien) |

## Paiement

Le paiement PayPal est implémenté en **liens simples** (PayPal.me ou autre lien de
paiement), pas d'intégration API/webhooks : le créateur de l'alliance clique "Payer avec
PayPal", puis "Demander l'activation" (statut `PENDING`), et un admin active
manuellement l'abonnement depuis `/admin` après vérification du paiement. C'est
volontairement simple pour démarrer — une vraie intégration PayPal Subscriptions
(webhooks, activation automatique) peut être ajoutée dans `src/app/actions/subscription.ts`
plus tard si besoin.

Configurez vos vrais liens PayPal via les variables d'env `NEXT_PUBLIC_PAYPAL_LINK_*`
(voir `.env.example`) — sinon un lien paypal.me générique préformaté est utilisé.

## Association joueur ↔ alliance

- Un joueur peut **créer gratuitement** sa propre alliance (trigramme + nom + serveur —
  il en devient le créateur/owner). Le serveur est créé à la volée s'il n'existe pas
  encore (`Server.upsert` dans `src/app/actions/alliance.ts`).
- Un **admin** peut aussi rattacher n'importe quel joueur à n'importe quelle alliance
  depuis `/admin` (menu déroulant par utilisateur).
- Seul le **créateur de l'alliance** peut demander/payer un abonnement.

## Formules & Hive Composition

Portées depuis le spec `SOG#669 dashboard reproduction spec` :

- `AttackScore = siege + range + cavs + ground`
- `DefenseScore = siegeAtk + groundDef + cavsHp + archerDeb + siegeAtkDeb + siegeHpDeb`
- `Ratio = AttackScore / DefenseScore` (`—` si défense nulle)
- `Setter = argmax( norm(AttackScore) + norm(RallyCap) )`, avec override manuel possible
- **Hive Composition** : le Setter au centre, les autres comptes placés par distance
  euclidienne croissante (triée par angle puis entrelacée pour équilibrer les côtés),
  remplis dans l'ordre décroissant d'Attack Score — voir `src/lib/domain.ts`.

Voir `src/lib/domain.ts` pour l'implémentation complète et commentée.

## Couleurs des buffs défensifs (Alliance)

Le brief demandait de reprendre "le même ordre et mêmes couleurs" que les 4 buffs
d'attaque (Ground/Ranged/Cavs/Siege) pour les 6 buffs défensifs. Hypothèse retenue :
chaque buff défensif est colorié selon le type de troupe qu'il protège :
`groundDef`→khaki, `archerDeb`→vert, `cavsHp`→violet, `siegeAtk`/`siegeAtkDeb`/`siegeHpDeb`→orange.
À ajuster dans `src/components/AlliancePageClient.tsx` si une autre correspondance était
voulue.

## Historisation

Chaque enregistrement/modification d'un compte (page Team) écrit à la fois la ligne
`Account` (état courant) et une ligne `AccountHistory` (append-only), qui alimente les
courbes d'évolution de la page Alliance.

## Structure

```
src/lib/          logique métier (auth, domain/formules, tier, prisma, format, guards)
src/app/actions/  Server Actions (auth, alliance, account, subscription, admin)
src/app/*/page.tsx pages (accueil, login, register, pricing, dashboard, team, alliance,
                    competitive, admin)
src/components/   composants UI + graphiques (Recharts) + Hive Composition (CSS grid 45°)
prisma/schema.prisma modèle de données
```

# ECiDé — site « campagne » (Next.js)

Seconde version du site public du parti, rendue à partir de la même API Laravel
(`../ecide-laravel`) que `../ecide-next` : même contenu, mêmes couleurs, mais une mise en
page façon site de campagne : structure inspirée de warnockforgeorgia.com (angles droits,
en-tête et sections bleu nuit, panneaux blancs, bandeau d'appel au don jaune avec les montants,
photo plein écran avec le formulaire d'inscription sur l'accueil) et typographie inspirée
d'obama.org (titres, menu et boutons en condensé gras — Barlow Condensed —, texte courant en
serif — Source Serif 4 —, filets épais au-dessus des titres, liens fléchés). Le contenu, les traductions et les
formulaires passent par l'API ; l'administration est commune aux deux sites.

Le site tourne sur le port 3002 (`-p 3002` dans `package.json`) pour cohabiter avec
`ecide-next` sur le port 3000. Les styles propres à cette version sont regroupés dans
`src/app/globals.css` (`.btn`, `.pill`, `.eyebrow`, `.panel`, `.rule-title`, `.arrow-link`, `.icon-tile`, `.diag`), et chaque page intérieure
commence par le bandeau bleu nuit de `src/components/PageBanner.tsx`. Trois pages propres à ce site
complètent la page Le Parti et sont insérées après elle (pied de page, cartes de l'accueil ; le menu hamburger
ne liste que les pages principales) par `siteNav()` : l'organigramme
(`/organigramme`), la charte des valeurs (`/charte-valeurs`) et le projet de société (`/projet-societe`).
Les deux dernières présentent le PDF téléversé dans l'administration (écran Le Parti, onglets « Charte des
valeurs » et « Projet de société ») : aperçu dans la page et téléchargement (`src/components/PdfDocument.tsx`).
La biographie du Président a aussi sa page (`/president/biographie`, sous « Président » dans le menu) : PDF de la
biographie officielle (écran Président, onglet « Biographie & parcours »), texte et repères, résumé de l'article
Wikipédia en français (`src/lib/wikipedia.ts`, rafraîchi chaque jour, simple lien si Wikipédia ne répond pas) et parcours.
Les fichiers téléversés (`/uploads/…`) sont relayés depuis Laravel par `next.config.ts`, comme `/assets/…`.

## Démarrer

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL, REVALIDATE_SECRET
npm run dev                    # http://localhost:3002 (l'API doit tourner sur NEXT_PUBLIC_API_URL)
npm run build && npm start     # production
npx tsc --noEmit && npm run lint
npm test                       # tests unitaires (Vitest, src/lib/*.test.ts)
npm run test:e2e               # tests de bout en bout : site (E2E_BASE_URL) et API (E2E_API_URL) en marche
npm run test:visual            # tests visuels : captures comparées aux références de tests/visual/baseline
npm run test:visual -- --update   # recrée les références après un changement de maquette voulu
```

Les tests de bout en bout et visuels pilotent Chrome (ou Edge) sans interface via le protocole
DevTools (`tests/browser.mjs`, sans dépendance) : réponses et langue de chaque page, 404 et
redirections, en-têtes de sécurité, formulaires, page de désabonnement, absence de débordement
horizontal dans les six langues à quatre largeurs, menu de bureau, sections hero. Une différence
visuelle au-delà de 0,5 % des pixels fait échouer la scène et dépose la capture et le diff dans
`tests/visual/output/`. Relancer `npm run dev` après toute modification de `next.config.ts`.

## Sécurité

- Les adresses externes saisies dans l'administration passent par `safeUrl()` (http(s), mailto,
  tel uniquement) ; le corps des articles est nettoyé côté API avant d'être rendu.
- `next.config.ts` envoie `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` et `Strict-Transport-Security` ; le JSON-LD échappe `<`.
- `POST /api/revalidate` compare le jeton en temps constant.

`REVALIDATE_SECRET` doit être identique dans le `.env` de Laravel : à chaque
enregistrement de l'administration, Laravel appelle `POST /api/revalidate` et les
pages sont régénérées à la visite suivante (sinon, elles se rafraîchissent toutes
les 60 secondes).

## Langues

Le français est servi à la racine (`/parti`), les autres langues sous préfixe
(`/en/parti`, `/ln/…`, `/sw/…`, `/tsh/…`, `/kik/…`). Les pages vivent dans
`src/app/[locale]/…` ; `next.config.ts` réécrit les adresses sans préfixe vers `/fr/…`
et redirige `/fr/…` vers la racine. Le sélecteur de l'en-tête ouvre la page courante
dans la langue choisie ; chaque page déclare ses versions (`hreflang`).

- Contenu : chaque page appelle `GET /api/v1/pages/…?lang=xx` et reçoit le contenu déjà
  traduit (traductions des éditeurs, puis traduction automatique, puis français).
- Interface : `GET /api/v1/i18n/{locale}` fournit le dictionnaire ; `getT()` côté
  serveur et `useI18n()` côté client renvoient `t("phrase française", { param })`.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/app/[locale]/` | Gabarit (en-tête, pied de page, polices) et pages : accueil, parti, president, cadres, diaspora, actualites, actualites/[slug], newsletter/desinscription (lien personnel des e-mails), contact, adherer, mentions-legales, 404 |
| `src/app/api/revalidate/` | Point d'entrée appelé par Laravel |
| `src/components/` | En-tête (menu, langue), pied de page, fil d'actualité, annuaires des cadres et de la diaspora, liste des actualités, don, formulaires, partage, fils sociaux |
| `src/lib/api.ts`, `types.ts` | Client de l'API et formes des réponses |
| `src/lib/locales.ts`, `t.ts`, `i18n.tsx`, `server.ts`, `nav.ts` | Langues, traduction d'interface, métadonnées, entrées de menu |
| `src/app/globals.css` | Thème Tailwind v4 (palette et polices du site) et styles du site d'origine |
| `public/assets/img` | Logo et images statiques ; tout autre chemin `/assets/…` (images ou documents gérés dans l'administration) est relayé depuis le serveur Laravel par `next.config.ts`, le navigateur n'appelle donc jamais l'API directement |

Les annuaires gardent leur état dans le fragment d'adresse (`/cadres#niveau=provincial&province=Kinshasa`),
ce qui permet les liens « Près de chez vous » de l'accueil.

## Lettre d'information

Les formulaires « Recevoir les communiqués » (pied de page, colonne des actualités) envoient
l'adresse, un prénom facultatif et la langue de la page à `POST /api/v1/forms/newsletter` ;
Laravel envoie un e-mail de bienvenue puis annonce chaque actualité publiée, dans la langue
de l'abonné. Chaque e-mail contient un lien personnel vers `/newsletter/desinscription?token=…`
(`NewsletterUnsubscribe.tsx` appelle `POST /api/v1/forms/newsletter/desinscription` et
propose le réabonnement). Réglages d'envoi (Mailtrap) : voir `../ecide-laravel/README-ECIDE.md`.

## Direct

La diffusion en direct (page `/direct`, studio `/direct/studio`, lecteur WebRTC/HLS) a été
retirée du site tant que l'infrastructure de diffusion (serveur MediaMTX) n'est pas disponible.
Les anciennes adresses `/direct…` redirigent vers les actualités (`next.config.ts`) et une
entrée de menu « Direct » encore présente dans l'administration est ignorée (`src/lib/nav.ts`).
Les replays restent publiés comme actualités (rubrique « Directs & replays »).

## Mise en page

Les textes viennent de l'API et leur longueur varie selon la langue : la mise en page ne doit
jamais déborder de l'écran. Règles appliquées dans `globals.css` : aucun défilement horizontal
(`overflow-x: clip` sur la page), coupure des mots trop longs (`overflow-wrap: anywhere`),
médias et tableaux du corps des articles bornés à la largeur disponible. Les rangées d'options
(onglets, puces, boutons) passent à la ligne, les barres de sommaire défilent horizontalement
dans leur cadre, et l'en-tête bascule sur le menu mobile dès que les libellés du menu de bureau
ne tiennent plus sur une ligne (`Header.tsx`).

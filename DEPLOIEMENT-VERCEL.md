# Déploiement du site public sur Vercel (staging)

Le site public (Next.js 16) est hébergé sur Vercel ; il lit l'API Laravel hébergée à part
(`https://api-staging-ecide.cmjcce.com`, voir `deploy/README.md` du dépôt `ecide-laravel`).

## 1. Avant tout : l'API doit répondre en HTTPS

La construction du site (`next build`) lit le contenu dans l'API : si elle ne répond pas, le
déploiement échoue. Vérifiez d'abord :

```bash
curl -fsS https://api-staging-ecide.cmjcce.com/api/v1/site | head -c 150
```

## 2. Créer le projet Vercel

1. vercel.com › **Add New › Project** › importer le dépôt GitHub `JTkasenda/ecide-campaign`.
2. **Framework** : Next.js (détecté). **Root Directory** : la racine du dépôt.
   **Build / Output / Install** : laisser les valeurs par défaut.
3. **Branche** : `site-campagne-admin` (Settings › Git › Production Branch, si besoin).
4. **Node.js** : 20 ou plus (Settings › General › Node.js Version ; 22 recommandé).
5. **Région des fonctions** (Settings › Functions) : la plus proche du serveur de l'API, pour
   que les pages et le relais de l'espace membre répondent vite.

## 3. Variables d'environnement (Settings › Environment Variables)

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-staging-ecide.cmjcce.com` |
| `NEXT_PUBLIC_SITE_URL` | adresse publique du site, par exemple `https://staging-ecide.cmjcce.com` |
| `REVALIDATE_SECRET` | **la même valeur** que `REVALIDATE_SECRET` du `.env` de l'API |
| `SITE_NOINDEX` | `true` (staging : jamais dans les moteurs de recherche) |

Les variables `NEXT_PUBLIC_*` sont figées au moment de la construction : après les avoir
modifiées, relancez un déploiement (Deployments › … › Redeploy).

## 4. Nom de domaine

Settings › Domains › ajouter `staging-ecide.cmjcce.com` (exemple). Chez le gestionnaire du
domaine `cmjcce.com`, créer l'enregistrement indiqué par Vercel, en général :

| Type | Nom | Valeur |
|---|---|---|
| CNAME | `staging-ecide` | `cname.vercel-dns.com` |

Vercel fournit le certificat HTTPS tout seul.

## 5. Côté API : reconnaître le site

Dans le `.env` de l'API, sur le serveur :

```bash
sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://staging-ecide.cmjcce.com|' .env
php artisan optimize
```

`FRONTEND_URL` sert :

- à autoriser les appels du navigateur vers l'API (CORS) ;
- aux liens « Voir le site » de l'administration et à ceux des e-mails ;
- à la régénération des pages : à chaque enregistrement dans l'administration, l'API appelle
  `https://…/api/revalidate` avec `REVALIDATE_SECRET`.

Les adresses de prévisualisation de Vercel (`…-git-….vercel.app`) ne sont pas autorisées par
l'API : testez sur le domaine du site.

## 6. Vérifier

- La page d'accueil s'affiche, avec la photo sans le drapeau d'un autre parti.
- Une modification dans l'administration (titre d'une page) apparaît sur le site en quelques secondes.
- L'espace membre : connexion par code, ajout d'une photo d'identité depuis un téléphone.
- La page « Vérifier une carte » : le bouton « Scanner le QR code » ouvre la caméra.

## Limites de Vercel prises en compte

- **4,5 Mo par requête vers les fonctions** : photos, pièces d'identité et listes de présence
  passent par le relais du site (`/api/membre/…`). Les photos sont réduites dans le navigateur
  avant l'envoi (`src/lib/upload.ts`) et chaque fichier est limité à 4 Mo. Les envois de
  l'administration vont directement à l'API et ne sont pas concernés.
- **Images** : non optimisées par Vercel (`images.unoptimized`), elles sont servies telles quelles
  par l'API, à travers les réécritures `/assets` et `/uploads` de `next.config.ts`.

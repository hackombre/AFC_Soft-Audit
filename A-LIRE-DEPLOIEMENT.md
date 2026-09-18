# AFC Soft Audit — correctifs de sécurité

Les fichiers de ce dossier remplacent ceux de `backend/` en conservant
l'arborescence :

```
app/rate_limit.py                  (NOUVEAU)
app/main.py                        (modifié)
app/google_oauth.py                (modifié)
app/routers/auth.py                (modifié)
app/routers/entities.py            (modifié)
app/routers/users.py               (modifié)
app/routers/documents.py           (modifié)
app/routers/guide_templates.py     (modifié)
.env.example                       (modifié)
```

Aucune nouvelle dépendance : `requirements.txt` est inchangé.
Aucune migration de base de données n'est nécessaire.

---

## 1. À faire AVANT de redémarrer l'API

Ajoutez ces lignes dans `backend/.env` :

```env
# Origines autorisées à appeler l'API. "*" est refusé.
CORS_ALLOWED_ORIGINS=https://VOTRE-DOMAINE-FRONTEND

# true uniquement derrière un reverse proxy de confiance
TRUST_PROXY_HEADERS=false
```

**L'API refuse désormais de démarrer si `CORS_ALLOWED_ORIGINS` est absent
ou ne contient que `*`.** C'est volontaire : une mauvaise configuration
échoue bruyamment au démarrage plutôt que silencieusement en production.

En développement, `http://localhost:3000` est la valeur par défaut.
En production, indiquez l'URL exacte du frontend, schéma compris
(`https://`), sans barre oblique finale. Plusieurs origines se séparent
par des virgules.

---

## 2. Ce qui a changé

### CORS (critique)

`allow_origins=["*"]` avec `allow_credentials=True` est remplacé par une
liste blanche issue du `.env`. Les méthodes et en-têtes sont également
restreints à ce que l'application utilise réellement.

Cette configuration était de toute façon rejetée par les navigateurs
modernes : il est possible que cela corrige aussi des erreurs CORS
observées en production.

### Endpoints Google OAuth (critique)

- `/api/google/oauth/start` exige maintenant un **compte associé**.
- `/api/google/oauth/callback` **ne renvoie plus le refresh token**.
  Le token est écrit directement dans `backend/.env` côté serveur, avec
  des permissions `600` là où le système le permet.
- Le callback ne pouvait pas être protégé par un jeton : c'est Google
  qui y redirige le navigateur, sans en-tête `Authorization`. Il est donc
  protégé par le `state` PKCE, qui n'existe que si `/start` a été appelé
  par un associé, est imprévisible, à usage unique, et expire en
  10 minutes.
- En cas d'échec, le détail technique reste dans les journaux serveur ;
  le navigateur ne reçoit qu'un message générique.

**Conséquence sur votre procédure :** il n'y a plus de copier-coller
manuel du token, ni de redémarrage de l'API. Le cache du service Drive
est vidé automatiquement et l'autorisation est effective immédiatement.

### Anti brute-force (critique)

Nouveau module `app/rate_limit.py`, sans dépendance externe : fenêtre
glissante en mémoire, avec deux limites complémentaires — par adresse IP
et par compte.

| Route | Par compte | Par IP | Fenêtre |
|---|---|---|---|
| `/login` | 5 | 10 | 15 min |
| `/change-password` | 5 | — | 15 min |
| `/verify-security-code` | 5 | 20 | 15 min |
| `/verify-password-reset-code` | 5 | 20 | 15 min |
| `/forgot-security-code` | 5 + 3 envois | 10 | 15 min / 1 h |
| `/forgot-password` | 3 envois | 10 | 1 h |

Les compteurs sont remis à zéro après une authentification réussie, pour
ne pas pénaliser un utilisateur ayant fait quelques fautes de frappe.
Les réponses bloquées renvoient un `429` avec un en-tête `Retry-After`.

Sur `/forgot-password`, la limite est appliquée **avant** toute recherche
en base, pour que le comportement reste identique qu'un compte existe ou
non — la non-divulgation des comptes existants est préservée.

**Limite connue :** les compteurs vivent dans le processus. Avec
plusieurs workers uvicorn, la limite effective est multipliée par le
nombre de workers, et tout est remis à zéro au redémarrage. C'est
suffisant pour un cabinet de cette taille. Si vous passez à plusieurs
instances, remplacez le stockage de `rate_limit.py` par Redis en gardant
la même interface `enforce_rate_limit` / `reset_rate_limit`.

### Compte associé initial (critique)

Le mot de passe `Afcsoft2024!` codé en dur est supprimé. Au premier
démarrage sur une base vide, le mot de passe est soit lu depuis
`AFCSOFT_BOOTSTRAP_PASSWORD`, soit **tiré au hasard sur 16 caractères et
affiché une seule fois** dans la console du serveur.

`must_change_password` reste positionné à `True`. **À vérifier de votre
côté :** que le frontend bloque bien toute navigation tant que ce
changement n'est pas effectué — le backend ne l'impose pas, il se
contente de signaler l'état.

### Cloisonnement des entités clients (élevé)

`GET /api/entities` renvoyait **tout le portefeuille clients** à
n'importe quel utilisateur authentifié. Désormais :

- un **associé** voit toutes les entités ;
- **tout autre utilisateur** ne voit que les entités pour lesquelles il
  est membre d'au moins une mission.

`GET /api/entities/{id}` applique la même règle. Un utilisateur hors
périmètre reçoit **404 et non 403** : un 403 confirmerait l'existence
du client, ce qui permettrait d'énumérer le portefeuille du cabinet en
testant des identifiants.

La création et la suppression d'entités restaient déjà réservées aux
associés.

Vérifié sur jeu d'essai : un auditeur membre de deux missions chez le
même client voit ce client une seule fois (déduplication), et ne voit
pas les clients où il n'est affecté à aucune mission.

### Module Utilisateurs (élevé)

`GET /api/users` exposait la liste complète du personnel (emails, rôles,
statuts) à tout utilisateur authentifié. La route exige désormais le
rôle **associé**, comme les autres routes du module.

Vérifié côté frontend avant restriction : `listUsers()` n'est appelé que
depuis la page Utilisateurs et depuis `MissionModal` /
`MissionAccessModal`, toutes conditionnées par `canManage`
(`role === 'associe'`). Aucun écran accessible aux non-associés n'est
donc impacté.

### Dépôt de documents (élevé)

`/api/documents/.../upload` n'avait aucun contrôle :

- extensions limitées à une liste blanche (bureautique, PDF, images
  numérisées, `.zip`) ;
- taille maximale de 25 Mo (`MAX_UPLOAD_BYTES`, ajustable en tête de
  `documents.py`) ;
- fichiers vides refusés ;
- noms de fichiers neutralisés : composants de chemin retirés,
  guillemets et sauts de ligne supprimés — ces caractères permettaient
  d'injecter des en-têtes dans le `Content-Disposition` au
  téléchargement. Même correction appliquée aux modèles de guides.

---

## 3. Points signalés et NON corrigés

Points de fond restants, à planifier.

1. **JWT en `localStorage`** : migration vers un cookie `httpOnly`
   recommandée, mais cela touche au frontend et au flux de connexion.

2. **Pas de révocation de jeton** : un jeton volé reste valide jusqu'à
   12 h. Une liste noire des jetons révoqués, ou des jetons plus courts
   avec rafraîchissement, serait plus sûre.

3. **`python-jose`** : peu maintenu, CVE historiques de confusion
   d'algorithme. Le risque immédiat est faible ici (`HS256` fixé en
   dur), mais une migration vers `PyJWT` serait plus pérenne.

4. **En-têtes de sécurité HTTP** (CSP, HSTS, X-Frame-Options) : à
   configurer au niveau du reverse proxy, hors code applicatif.

5. **Mots de passe et codes envoyés en clair par email** : pratique
   courante, mais à garder en tête dans votre analyse de risque.

---

## 4. Vérifications après déploiement

- L'API démarre et affiche `[AFCsoft CORS] Origines autorisées : ...`
- Connexion normale depuis le frontend : OK
- 6 mots de passe erronés d'affilée sur un compte : `429` avec
  `Retry-After`
- Un bon mot de passe après 2 erreurs : passe sans blocage
- `/api/google/oauth/start` sans jeton d'associé : `401` / `403`
- Dépôt d'un `.exe` ou d'un fichier de 50 Mo : `400` / `413`
- Connecté en auditeur : la liste des clients ne montre que ceux où il a
  une mission ; le module Utilisateurs renvoie `403`
- Connecté en associé : tous les clients et tous les utilisateurs
  restent visibles

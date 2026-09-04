# AFCsoft Audit — Web App

Plateforme web de gestion de missions d'audit : questionnaire d'audit complet
(397 questions, extrait de `questionnaire_AFCsoft.docx`), gestion des
utilisateurs et des rôles, gestion de missions.

- **Backend** : FastAPI + SQLAlchemy (SQLite par défaut)
- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS

## Rôles

Associé · Directeur de mission · Chef de mission · Auditeur senior · Auditeur junior.

Seul un **associé** peut créer des utilisateurs et leur attribuer un rôle
(page **Utilisateurs**, accessible depuis l'icône dans la barre du haut).
Un associé ou un directeur de mission peut créer une mission.

## Navigation

La barre latérale n'affiche que la **liste des missions créées** (recherche +
filtre par date de clôture). On consulte une mission en cliquant dessus : la
structure d'audit et le questionnaire s'affichent alors à côté. La barre du
haut donne accès à **Documentation** et, pour l'associé, **Utilisateurs**.

## Démarrage rapide

### 1. Backend (FastAPI)

Sous Windows, double-cliquez simplement sur `backend\run.bat` (crée
l'environnement virtuel, installe les dépendances et démarre le serveur).

Sinon, manuellement :

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Au tout premier démarrage, un compte **Associé** est créé automatiquement :

```
email        : associe@afcsoft.com
mot de passe : Afcsoft2024!
```

**Changez ce mot de passe dès la première connexion**, puis créez vos
véritables utilisateurs depuis la page Utilisateurs.

L'API est documentée automatiquement sur http://localhost:8000/docs

### 2. Frontend (Next.js)

Sous Windows, double-cliquez sur `frontend\run.bat`.

Sinon, dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

Ouvrez http://localhost:3000 — vous serez redirigé vers la page de connexion.

Par défaut, le frontend proxyfie `/api/*` vers `http://localhost:8000`
(voir `frontend/next.config.js` et `frontend/.env.example` — variable
`NEXT_PUBLIC_API_URL` si le backend tourne ailleurs).

## Entités et missions

Une **entité** (société cliente) doit exister avant de pouvoir créer une
mission. La barre latérale affiche d'abord la liste des entités ; en
sélectionner une affiche ses missions dans la même barre. La création
d'une entité (nom, raison sociale, forme juridique, RCCM, NIU, sigle) et
d'une mission (nom + date de clôture via calendrier) se fait via une
fenêtre modale, sans changer de page.

Quand une mission est ouverte, si la raison sociale et la forme juridique
de l'entité sont renseignées, elles pré-remplissent automatiquement les
questions correspondantes dans « Éléments relatifs à la structure de
l'entité ». Le tableau de répartition du capital calcule aussi
automatiquement la colonne Capital (Nombre de titres × Nominal) et signale
un écart si la somme ne correspond pas au capital saisi.

## Documents classés par étape/sous-étape

La page **Documents** permet d'importer des fichiers et de les classer dans
l'arborescence du questionnaire (section → étape → sous-étape), exactement
comme un explorateur de fichiers : on choisit un dossier (une étape) dans
l'arbre à gauche, puis on glisse-dépose ou importe les fichiers qui y seront
rattachés. Chaque dossier affiche le nombre de fichiers qu'il contient.

Côté backend, les fichiers sont stockés sur disque sous
`backend/uploads/<mission_id>/<node_id>/` et indexés en base (table
`documents`) avec le fichier, la taille, qui l'a importé et quand.

## Création d'une mission

Le formulaire de création (page **Ajouter une mission**) ne demande que
l'essentiel pour démarrer : le **nom de la mission** et sa **date de
clôture** (choisie via un calendrier). L'exercice et la raison sociale
complète sont optionnels. La progression du questionnaire et le nombre de
jours restants avant la clôture sont ensuite affichés sur la liste des
missions.

## Éditer le questionnaire directement dans le code source

Toutes les questions vivent dans **un seul fichier Python**, lisible et
commenté :

```
backend/app/data/questionnaire_data.py
```

C'est la source unique de vérité du questionnaire. Pour :

- **Ajouter une question** → ajouter un dict à la liste `questions` du bon
  nœud (section/étape/sous-étape), avec un `id` unique.
- **Modifier une question** → éditer le dict correspondant (label, type,
  options, colonnes, condition d'affichage…).
- **Supprimer une question** → retirer le dict de la liste.
- **Réordonner** → changer l'ordre des dicts dans la liste (l'ordre affiché
  suit strictement l'ordre Python).

Redémarrez simplement le serveur backend après modification — aucune
migration de base de données n'est nécessaire (les questions ne sont pas
stockées en base, seules les réponses le sont, indexées par `question_id`).

Types de champ disponibles : `text`, `textarea`, `number`, `date`, `radio`,
`radio_na` (Oui/Non/N/A), `select`, `table`, `checkbox_list`, `collecte`,
`file`.

Affichage conditionnel :

```python
{
    "id": "A-1-19",
    "label": "Dénomination du groupe",
    "type": "text",
    "conditionalOn": {"questionId": "A-1-18", "value": "oui"},
}
```

`conditionalOn` peut aussi être une **liste** de conditions (toutes doivent
être vraies pour que la question s'affiche).

### Note sur la génération automatique du questionnaire

Les 397 questions ont été extraites et structurées **automatiquement** à
partir de `questionnaire_AFCsoft.docx` (hiérarchie des titres, codes de
question, types de réponse, tableaux, conditions d'affichage détectées par
analyse de texte). C'est un excellent point de départ fidèle au document
d'origine, mais sur un document aussi long, quelques questions isolées
peuvent avoir un type mal détecté, un libellé tronqué, ou une colonne de
tableau générique — une relecture rapide du fichier (ou au fil de
l'utilisation) permettra d'ajuster ces cas ponctuels directement dans le
code source, comme prévu.

## Structure du projet

```
backend/
  app/
    main.py                  → point d'entrée FastAPI
    models.py                → modèles SQLAlchemy (User, Mission, Answer…)
    schemas.py                → schémas Pydantic
    auth.py                   → JWT, hachage des mots de passe
    database.py                → configuration SQLite/PostgreSQL
    questionnaire_utils.py     → utilitaires (aplatissement, comptage)
    data/
      questionnaire_data.py    → LE QUESTIONNAIRE (source unique éditable)
    routers/
      auth.py, users.py, missions.py, questionnaire.py, documents.py
  requirements.txt

frontend/
  app/
    login/page.tsx
    (app)/                       → shell protégé (topbar uniquement)
      missions/page.tsx          → poste de travail : liste des missions (sidebar)
                                    + structure d'audit + questionnaire de la
                                    mission sélectionnée (commentaires, pièces
                                    jointes par question)
      missions/nouvelle/page.tsx → création (nom + date de clôture via calendrier)
      documentation/page.tsx     → Documents reçus / Travaux effectués,
                                    classés automatiquement par étape/sous-étape
      utilisateurs/page.tsx      → gestion des utilisateurs (associé)
  components/
    Logo.tsx, TopBar.tsx, MissionsPanel.tsx, DatePicker.tsx
    questionnaire/QuestionField.tsx, QuestionnaireTree.tsx
    documents/FolderTree.tsx
  lib/
    api.ts, auth-context.tsx, mission-context.tsx,
    questionnaire-utils.ts, types.ts
  package.json
```

## Déploiement

- **Backend** : n'importe quel hébergeur Python (Railway, Render, un VPS
  avec `uvicorn`/`gunicorn`). Définissez `DATABASE_URL` pour passer sur
  PostgreSQL en production, et `SECRET_KEY`.
- **Frontend** : Vercel (recommandé pour Next.js) ou tout hébergeur Node.
  Définissez `NEXT_PUBLIC_API_URL` vers l'URL du backend déployé.

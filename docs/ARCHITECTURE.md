# Architecture de Monmail

## Vue d'ensemble

Monmail est une application de bureau Electron pour Windows. Elle utilise une architecture à trois couches :

1. le processus principal Electron accède au système, au réseau et aux données locales ;
2. le preload expose une API IPC limitée ;
3. le renderer affiche l'interface HTML/CSS et orchestre les interactions utilisateur.

Les messages et métadonnées de messagerie restent locaux. La boîte à idées constitue l'unique service applicatif distant du projet : une API Node.js séparée, prévue pour un serveur OVH et reliée à PostgreSQL.

## Structure réelle du projet

```text
gestionmail/
├── .github/workflows/release.yml
├── package.json
├── package-lock.json
├── README.md
├── TODO.md
├── todos.json
├── server/ideas-api/
│   ├── server.js
│   ├── schema.sql
│   └── package.json
└── src/
    ├── assets/mail.ico
    ├── main/
    │   ├── main.js
    │   ├── preload.js
    │   ├── account-store.js
    │   ├── message-store.js
    │   ├── mail-service.js
    │   ├── pop3-client.js
    │   ├── oauth-service.js
    │   ├── settings-store.js
    │   ├── composer-store.js
    │   ├── todo-store.js
    │   ├── idea-service.js
    │   ├── backup-store.js
    │   └── diagnostic.js
    └── renderer/
        ├── index.html
        ├── app.js
        ├── styles.css
        └── message-window.*
```

`dist/`, `node_modules/`, `release/`, `out/` et les caches sont exclus du suivi et ne font pas partie de l'architecture source.

## Processus principal et cycle de vie

`src/main/main.js` est le point d'entrée déclaré dans `package.json`. Il :

- conserve le profil historique dans `%APPDATA%\GestionMail` ;
- place le cache Chromium sous `%LOCALAPPDATA%\Monmail\Cache` ;
- impose une seule instance hors smoke test ;
- crée la fenêtre principale et les fenêtres autonomes de message ;
- configure le tray, les notifications et le compteur de messages non lus ;
- enregistre les handlers IPC ;
- applique une restauration différée avant de créer l'interface ;
- déclenche l'indexation différée des fichiers EML locaux ;
- gère la vérification, le téléchargement et l'installation explicite des mises à jour GitHub.

Les fenêtres utilisent `contextIsolation: true`, `nodeIntegration: false` et `sandbox: true`. Les liens externes ne sont ouverts que pour les protocoles HTTP, HTTPS et `mailto`.

## Frontière IPC et renderer

`src/main/preload.js` utilise `contextBridge` pour exposer `window.gestionMail`. Cette API regroupe les opérations de comptes, contacts, TODO, règles, brouillons, dossiers, messages, pièces jointes, paramètres, sauvegardes et mises à jour.

`src/renderer/index.html` définit l'interface principale et une CSP restrictive. `src/renderer/app.js` maintient l'état d'interface, charge comptes et données via le preload, gère la navigation, la rédaction, la recherche, les dossiers, les paramètres et les boîtes de dialogue. Il ne dispose pas d'un accès Node direct.

`message-window.html`, `message-window.js` et `message-window.css` constituent une fenêtre de lecture séparée, utilisant la même frontière IPC.

La boîte à idées utilise également cette frontière : `idea-service.js` lit `ideasApiUrl` dans `%ProgramData%\Monmail\machine.json`, impose HTTPS hors développement local et effectue les appels réseau depuis le processus principal. Le poste d’amorçage possède un jeton séparé dans `%ProgramData%\Monmail\ideas-admin-token` pour définir le mot de passe administrateur. Les autres postes obtiennent après connexion un jeton de session conservé uniquement en mémoire. Aucun accès PostgreSQL ni secret de base n'est exposé au renderer.

## Stockage local

Le stockage est réparti entre plusieurs emplacements :

- `%APPDATA%\GestionMail\accounts.json` : comptes, avec mots de passe et jetons chiffrés par `safeStorage` ;
- `%APPDATA%\GestionMail\settings.json` : préférences, apparence et emplacement des données ;
- `%APPDATA%\GestionMail\composer.json` : signatures et modèles ;
- fichiers TODO JSON et Markdown dans le dossier local choisi ou, par défaut, dans le profil ;
- `<dataDirectory>\messages.sqlite` : base SQLite ouverte avec `node:sqlite` et journal WAL ;
- `<dataDirectory>\Dossiers locaux` : arborescence locale et fichiers EML ;
- un dossier local distinct peut aussi être associé à chaque compte.

La base SQLite contient notamment les messages, pièces jointes, dossiers locaux, contacts, groupes, règles, applications de règles et brouillons. `message-store.js` crée le schéma à la demande et contient des migrations additives basées sur `PRAGMA table_info`.

`backup-store.js` crée une sauvegarde de format 1 avec manifeste, profil, base SQLite et dossiers locaux. La restauration est planifiée puis appliquée au prochain démarrage ; une copie `avant-restauration-*` est créée avant remplacement.

## Messagerie et services externes

`mail-service.js` orchestre :

- IMAP avec `imapflow` pour dossiers, synchronisation, lecture, copie, déplacement et suppression distante ;
- POP3 avec le client TCP/TLS local `pop3-client.js` pour la récupération ;
- SMTP avec `nodemailer` pour l'envoi ;
- l'analyse MIME avec `mailparser` ;
- l'assainissement des contenus HTML avec `sanitize-html`.

Les opérations distantes de dossiers et de messages nécessitent IMAP. POP3 est limité par la nature du protocole et ne fournit pas ces capacités de classement serveur.

`oauth-service.js` prend en charge Google et Microsoft avec OAuth2 PKCE. Le navigateur système est ouvert et le retour se fait sur un serveur HTTP temporaire lié à `127.0.0.1`. Les endpoints Google et Microsoft, les serveurs IMAP/POP3/SMTP configurés par l'utilisateur et GitHub Releases sont les services externes identifiés.

## Boîte à idées sur OVH

`server/ideas-api/server.js` fournit `GET /health` et `POST /ideas` publiquement. Chaque création génère une preuve de consultation aléatoire dont seule l’empreinte est stockée dans PostgreSQL ; le renderer conserve localement la preuve dans son `localStorage`. `POST /ideas/mine` restitue uniquement les idées accompagnées d’une preuve correcte. `GET /ideas`, qui renvoie la liste globale, exige une authentification administrateur. Les routes `/admin/login`, `/admin/logout` et `/admin/password` gèrent un mot de passe dérivé avec `scrypt`, au maximum cinq tentatives par adresse sur quinze minutes, et des sessions de douze heures conservées en mémoire. `PATCH /ideas/:id` et `DELETE /ideas/:id` exigent également une session administrateur ou le jeton d’amorçage. L'API valide les longueurs, limite les requêtes à 16 Kio, ajoute un honeypot et applique une limitation en mémoire de dix propositions par adresse IP et par heure.

`server/ideas-api/schema.sql` crée une table `ideas` indépendante de la base fonctionnelle d'Umami. La colonne `viewer_token_hash` relie une proposition à sa preuve locale sans stocker cette preuve en clair. Les statuts possibles sont `pending`, `published`, `completed` et `rejected`. Par défaut, les propositions sont publiées immédiatement ; `DEFAULT_IDEA_STATUS=pending` active une modération préalable.

Le déploiement OVH actuel utilise le conteneur `monmail-ideas-api-1`, relié au réseau Docker externe `umami_default`. Il atteint le conteneur PostgreSQL existant `umami-db` avec le rôle et la base dédiés `monmail_ideas`. Le script conserve les secrets non versionnés dans `.env` et `.admin-token`, avec des permissions limitées. Le volume local non versionné `admin-data/` conserve uniquement le sel et l’empreinte `scrypt` du mot de passe. Le port de l'API est publié uniquement sur `127.0.0.1:3001`, puis Nginx l'expose sur `https://idees.digitalh.fr` avec un certificat Let's Encrypt. Le port PostgreSQL n'est pas exposé à Internet et Umami conserve sa propre base.

## Validation

Le smoke test est intégré à `main.js` et utilise un profil temporaire. Il couvre le chargement Electron et plusieurs contrôles fonctionnels : assainissement HTML, pièces jointes, stockage SQLite, comptes et secrets, TODO, conversations, migration du répertoire de données, EML, paramètres, sauvegarde et éléments d'interface.

`diagnostic.js` est distinct : il ouvre le profil réel, teste les comptes, liste les dossiers, synchronise la boîte de réception, vérifie la recherche locale et crée une sauvegarde temporaire. Ce diagnostic n'est pas un test isolé et ne doit pas être lancé sans autorisation.

## Construction et publication

`electron-builder` produit deux cibles Windows x64 dans `dist/` :

- un installateur NSIS `Monmail-Setup-<version>.exe` ;
- une version portable `Monmail-Portable-<version>.exe`.

La configuration de publication pointe vers le dépôt GitHub `lhutinet/gestionmail`. Le workflow `.github/workflows/release.yml` se déclenche lors d'un push d'un tag `v*`, utilise Node.js 22, exécute `npm ci`, `npm run check`, construit les exécutables sans publication automatique d'`electron-builder`, puis crée une GitHub Release avec les artefacts.

Les mises à jour intégrées s'appuient sur ces Releases. Selon le README, seule la version NSIS installée est actualisable automatiquement ; la version portable doit être remplacée manuellement. Aucun certificat de signature de code n'est configuré dans les fichiers consultés.

# Consignes du projet Monmail

## Objectif du projet

Monmail est un client de messagerie de bureau pour Windows, construit avec Electron et orienté stockage local. Il permet de configurer des comptes IMAP ou POP3 avec envoi SMTP, de synchroniser et classer les messages, de travailler hors connexion, de gérer les pièces jointes, contacts, brouillons, règles, dossiers locaux et TODO, puis de sauvegarder et restaurer les données de l'utilisateur.

Le code et les fichiers suivis par Git sont la source de vérité. Le `README.md` décrit le périmètre fonctionnel, mais toute divergence doit être vérifiée dans l'implémentation et l'historique avant de modifier la documentation.

## Reprise et documents de référence

- Au début d'une nouvelle session, lire `docs/ETAT_PROJET.md` et `docs/DECISIONS.md`.
- Lire `docs/ARCHITECTURE.md` avant un changement structurel, lié au stockage, à Electron, à la sécurité ou à la publication.
- Vérifier `git status --short --branch` avant toute modification et préserver les changements existants hors périmètre.
- Mettre à jour ces documents lorsqu'un changement modifie durablement l'architecture, l'état du projet ou une décision.
- Signaler les informations incertaines au lieu de les inventer.

## Règles de modification

- Préserver les fonctionnalités, données utilisateur, chemins historiques et comportements existants sauf demande explicite.
- Faire des changements petits et ciblés ; ne pas reformater les grands fichiers sans rapport avec la demande.
- Ne jamais modifier directement `node_modules/`, `dist/`, `release/`, `out/`, les caches, les journaux ou d'autres fichiers générés.
- Ne pas ajouter ni mettre à jour une dépendance sans nécessité confirmée et accord du propriétaire.
- Ne jamais manipuler les données réelles du profil Windows pour un test non demandé.
- Préserver le chemin de profil historique `%APPDATA%\GestionMail`, malgré le nom actuel Monmail, tant qu'une migration explicite et sûre n'est pas décidée.
- Pour tout changement de stockage, considérer ensemble la base SQLite, ses fichiers WAL/SHM, les dossiers EML, les dossiers propres aux comptes, les fichiers JSON du profil et les sauvegardes.
- Pour tout changement de messagerie, distinguer les capacités IMAP des limites POP3 et éviter toute suppression, déplacement ou envoi réel pendant les tests.

## Fichiers importants

- `package.json` : scripts, dépendances, point d'entrée Electron et configuration `electron-builder`.
- `src/main/main.js` : cycle de vie Electron, fenêtres, tray, IPC, notifications, mises à jour, synchronisation et smoke test.
- `src/main/preload.js` : API IPC explicitement exposée au renderer sous `window.gestionMail`.
- `src/renderer/index.html`, `src/renderer/app.js` et `src/renderer/styles.css` : interface principale, état côté renderer et styles.
- `src/renderer/message-window.*` : fenêtre autonome de lecture d'un message.
- `src/main/message-store.js` : SQLite, messages, pièces jointes, contacts, groupes, brouillons, règles et dossiers locaux.
- `src/main/account-store.js` : comptes et chiffrement des mots de passe et jetons avec `safeStorage`.
- `src/main/mail-service.js` : IMAP, POP3, SMTP, analyse MIME et assainissement HTML.
- `src/main/pop3-client.js` : client POP3 natif TCP/TLS.
- `src/main/oauth-service.js` : autorisation OAuth2 Google/Microsoft avec PKCE et retour local.
- `src/main/settings-store.js`, `composer-store.js` et `todo-store.js` : préférences, signatures/modèles et TODO.
- `src/main/idea-service.js` : client HTTPS de la boîte à idées partagée.
- `src/main/backup-store.js` : création, validation et restauration différée des sauvegardes.
- `server/ideas-api/` : API Node.js, schéma PostgreSQL et instructions de déploiement OVH de la boîte à idées.
- `config/machine.example.json` : exemple de configuration publique à copier dans `%ProgramData%\Monmail\machine.json`.
- `src/main/diagnostic.js` : diagnostic réel des comptes et du stockage ; il contacte les services externes.
- `.github/workflows/release.yml` : construction et publication des versions Windows à partir des tags `v*`.
- `README.md`, `TODO.md` et `todos.json` : documentation générale et historique des tâches suivies.

## Conventions de code

- Conserver JavaScript CommonJS (`require`, `module.exports`) dans le code existant.
- Garder les libellés, messages d'erreur, commentaires utiles et textes accessibles en français.
- Maintenir la séparation Electron : accès système dans le processus principal, API minimale dans le preload, interface dans le renderer.
- Conserver `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` et une CSP restrictive.
- Ajouter une opération renderer/principal via un canal IPC explicite et validé, exposé dans `preload.js` ; ne pas donner un accès Node générique au renderer.
- Valider les entrées, les chemins et les noms de fichiers avant toute opération disque.
- Continuer d'assainir le HTML des courriels et de bloquer les protocoles de liens non autorisés.
- Chiffrer les mots de passe et jetons avec `safeStorage` ; ne jamais les retourner dans les objets publics de compte.
- Conserver les écritures atomiques ou transactionnelles lorsqu'elles sont déjà utilisées.

## Commandes de vérification

Depuis la racine du projet sous PowerShell, préférer `npm.cmd` car `npm.ps1` peut être bloqué par la politique d'exécution Windows :

```powershell
npm.cmd run check
npm.cmd run smoke
npm.cmd run diagnostic:real
npm.cmd run dist:win
git diff --check
```

- `npm.cmd run check` vérifie la syntaxe des principaux fichiers JavaScript.
- `npm.cmd run smoke` est la validation automatisée principale. Elle utilise un profil temporaire isolé et couvre le démarrage ainsi que plusieurs fonctions de stockage, sécurité et interface.
- `npm.cmd run diagnostic:real` utilise les comptes réels, contacte IMAP/POP3/SMTP et synchronise des données. Ne l'exécuter qu'à la demande explicite du propriétaire.
- `npm.cmd run dist:win` produit les exécutables Windows dans `dist/`. Ne le lancer que si la distribution doit être vérifiée.
- Il n'existe pas de script de lint ni de suite de tests séparée dans un dossier de tests.

## Limites de sécurité

- Ne jamais lire, afficher, copier ou versionner les mots de passe, jetons OAuth, contenus privés de messages ou données du profil utilisateur.
- Ne jamais ajouter `accounts.json`, `settings.json`, `composer.json`, `messages.sqlite`, les fichiers WAL/SHM, les sauvegardes ou les dossiers EML réels au dépôt.
- Ne pas envoyer de courriel, supprimer ou déplacer un message distant, créer ou supprimer un dossier serveur, ni lancer une synchronisation réelle sans demande explicite.
- Ne pas déclencher une restauration de sauvegarde à titre de test sur le profil réel.
- Ne jamais placer `DATABASE_URL`, un mot de passe PostgreSQL ou un secret de serveur dans le client Electron ou dans Git. La base doit rester derrière l'API et ne pas être exposée sur Internet.
- Ne pas affaiblir la CSP, le sandbox Electron, l'isolation de contexte, la validation des URL ou l'assainissement HTML sans décision de sécurité explicite et documentée.
- Les identifiants clients OAuth Google/Microsoft et la configuration des fournisseurs sont externes au dépôt ; ne pas en inventer.
- Une version non signée peut déclencher les avertissements Windows. Ne pas prétendre qu'une signature est configurée sans certificat confirmé.

## Règles Git

- Commencer par `git status --short --branch` et préserver les modifications existantes hors périmètre.
- Examiner le diff final et terminer par `git diff --check`.
- Ne jamais utiliser `git reset --hard`, `git clean` ni écraser une modification du propriétaire sans demande explicite.
- Ne jamais ajouter les dépendances, caches, sorties de compilation, journaux ou données utilisateur.
- Ne pas créer de tag ou de Release GitHub sans demande explicite : un tag `v*` déclenche la construction et la publication Windows.
- Ne jamais créer de commit ni effectuer de push spontanément.
- La formule « fais un git » constitue une demande explicite complète : vérifier le périmètre, créer un commit avec un message détaillé, puis pousser directement la branche active sans demander de confirmation supplémentaire.
- Lorsque le propriétaire demande « fais un git », ne pas lancer de compilation, de smoke test, de diagnostic ou d'autres vérifications superflues sauf demande explicite ; se limiter aux contrôles Git nécessaires au commit et au push.
- La création ou le push d'un tag reste une opération distincte, car un tag `v*` déclenche une publication Windows ; elle exige une demande explicite mentionnant le tag ou la publication.
- Une demande formulée sous la forme `v1.03` constitue cette demande explicite : l’interpréter au format SemVer `v1.0.3`, créer et pousser ce tag, puis vérifier le résultat de la Release GitHub.

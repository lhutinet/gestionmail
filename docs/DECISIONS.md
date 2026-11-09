# Décisions durables de Monmail

Ce document conserve les choix confirmés par le code, la configuration ou l'historique consulté. Les observations non confirmées comme choix produit sont indiquées comme telles.

## Application Electron locale pour Windows

**Décision** — Monmail reste une application de bureau Electron ciblant Windows x64.

**Raison** — L'application dépend des fenêtres Electron, du tray, des notifications, de `safeStorage`, des dialogues système, du stockage local et d'une distribution NSIS/portable.

**Alternative non retenue** — Une application web ou un service distant. Aucun backend Monmail n'existe dans le dépôt et les données sont conçues pour rester locales.

## Architecture Electron isolée

**Décision** — Conserver les accès privilégiés dans le processus principal et n'exposer au renderer qu'une API IPC explicite via le preload.

**Raison** — Les fenêtres utilisent `contextIsolation`, le sandbox et l'absence de Node dans le renderer. Cette frontière limite l'impact d'un contenu de courriel malveillant.

**Alternative abandonnée** — Activer `nodeIntegration` ou exposer directement `ipcRenderer` et les API Node au renderer.

## Stockage local hybride

**Décision** — Conserver SQLite pour les messages et données relationnelles, des fichiers JSON pour le profil et des fichiers EML pour les dossiers locaux visibles sur disque.

**Raison** — SQLite permet recherche, relations et fonctionnement hors connexion ; les JSON conviennent aux préférences et comptes ; les EML rendent les archives locales accessibles depuis Windows.

**Alternative non retenue** — Une base cloud centrale. Aucun service de synchronisation Monmail n'est implémenté.

## Profil historique `GestionMail`

**Décision** — Continuer d'utiliser `%APPDATA%\GestionMail` pour le profil malgré le nom de produit Monmail.

**Raison** — Le commentaire du point d'entrée indique explicitement la conservation du profil historique, ce qui évite de perdre les données existantes après le renommage.

**Alternative abandonnée** — Basculer directement vers `%APPDATA%\Monmail` sans migration.

## Secrets protégés par Windows

**Décision** — Chiffrer mots de passe et jetons OAuth avec `safeStorage` et ne pas les inclure dans les objets publics de compte.

**Raison** — Les secrets restent liés à la protection native de la session Windows et ne circulent pas dans le renderer sans besoin.

**Alternative abandonnée** — Stocker les secrets en clair dans `accounts.json` ou dans le dépôt.

## IMAP, POP3 et SMTP

**Décision** — Prendre en charge IMAP et POP3 pour la réception, SMTP pour l'envoi, avec les opérations distantes avancées réservées à IMAP.

**Raison** — IMAP fournit dossiers, UID et commandes de déplacement/copie/suppression ; POP3 ne possède pas ces capacités équivalentes.

**Alternative non retenue** — Simuler des opérations serveur IMAP pour les comptes POP3.

## OAuth2 Google et Microsoft avec PKCE

**Décision** — Utiliser le navigateur système, PKCE et un callback temporaire sur `127.0.0.1` pour Google et Microsoft.

**Raison** — Ce flux correspond à une application de bureau et évite d'intégrer un secret client dans le code.

**Alternative abandonnée** — Embarquer un secret OAuth ou collecter le mot de passe du fournisseur pour contourner OAuth.

## Assainissement du contenu des courriels

**Décision** — Assainir le HTML reçu et envoyé, bloquer scripts, styles dangereux, URL non autorisées et chargement direct des images distantes.

**Raison** — Les courriels sont des contenus non fiables affichés dans une application disposant de fonctions locales sensibles.

**Alternative abandonnée** — Afficher le HTML brut ou autoriser les protocoles `javascript:` et `file:`.

## Sauvegarde explicite et restauration différée

**Décision** — Produire une sauvegarde avec manifeste et restaurer au redémarrage après création d'une copie `avant-restauration-*`.

**Raison** — La base et plusieurs fichiers doivent être remplacés de manière cohérente alors qu'ils peuvent être ouverts pendant l'exécution.

**Alternative abandonnée** — Écraser immédiatement le profil actif sans copie de récupération.

## TODO locale enrichie par la boîte à idées distante

**Décision** — Conserver les tâches personnelles locales et afficher aussi dans la vue TODO les idées anonymes partagées par l'API OVH.

**Raison** — Les idées deviennent directement visibles dans le flux de traitement sans faire disparaître les tâches privées ni les déplacer dans la base distante.

**Alternative abandonnée** — Remplacer silencieusement les TODO personnelles par une liste publique partagée.

## Administration des idées par connexion temporaire

**Décision** — La lecture et la proposition restent publiques et anonymes. Terminer ou supprimer une idée exige une connexion par mot de passe ; la session de douze heures reste uniquement en mémoire et disparaît à la fermeture de Monmail. Le jeton dans `%ProgramData%\Monmail\ideas-admin-token` est réservé à l’amorçage et au changement du mot de passe.

**Raison** — Plusieurs personnes peuvent contribuer sans compte, tandis que le propriétaire peut traiter les idées depuis plusieurs ordinateurs sans copier un secret technique sur chacun. Le serveur ne conserve qu’une empreinte `scrypt` et limite les tentatives de connexion.

**Alternatives abandonnées** — Inclure le jeton dans l'application distribuée, limiter définitivement l’administration à un seul PC ou autoriser anonymement les changements de statut et suppressions.

**Visibilité de l’interface** — La boîte à idées reste visible sans connexion. Le bouton TODO, qui sert au traitement des idées, n’est affiché qu’après authentification administrateur et disparaît à la déconnexion.

## Mémoire locale des propositions anonymes

**Décision** — Une installation non administratrice ne reçoit jamais la liste globale. Lorsqu’elle crée une idée, elle conserve dans le stockage local Electron l’identifiant et une preuve aléatoire permettant de retrouver uniquement cette proposition aux ouvertures suivantes. La preuve n’est pas un compte utilisateur et n’est pas synchronisée entre ordinateurs.

**Raison** — L’utilisateur peut suivre ses propositions sans créer de compte, tandis que les idées des autres restent invisibles. Quand une idée est supprimée côté administrateur, la prochaine consultation ne la reçoit plus et sa référence locale est nettoyée.

**Alternative abandonnée** — Laisser `GET /ideas` public ou identifier l’auteur par son adresse IP, son adresse e-mail ou un compte obligatoire.

## PostgreSQL accessible uniquement par l'API

**Décision** — L'application Electron appelle une API HTTPS ; elle ne se connecte jamais directement à PostgreSQL et ne contient aucun identifiant de base.

**Raison** — Un secret inclus dans une application distribuée serait récupérable et l'exposition publique de PostgreSQL augmenterait fortement le risque. L'API centralise validation, limitation des abus et évolution du schéma.

**Alternative abandonnée** — Intégrer `DATABASE_URL` ou un mot de passe PostgreSQL dans Monmail.

## Smoke test avec profil temporaire

**Décision** — La validation automatisée principale utilise `--smoke-test` et un profil temporaire distinct.

**Raison** — Le test peut exercer stockage, migration, sauvegarde et interface sans toucher aux données réelles.

**Limite reconnue** — Ce smoke test intégré ne remplace pas une suite de tests unitaires et d'intégration séparée.

## Publication par tags GitHub

**Décision** — Construire et publier les artefacts Windows via GitHub Actions lorsqu'un tag `v*` est poussé.

**Raison** — Le workflow exécute une installation reproductible, vérifie le code, construit NSIS et portable, puis attache les artefacts à une Release utilisée par `electron-updater`.

**Alternative non retenue** — Publier automatiquement chaque commit de `master`.

## Mise à jour sous contrôle de l'utilisateur

**Décision** — La recherche peut être automatique, mais téléchargement et installation restent explicites ; la version portable est remplacée manuellement.

**Raison** — Le README et les handlers de mise à jour séparent la détection, le téléchargement et l'installation.

## Convention « fais un git »

**Décision** — Codex ne crée aucun commit ni push spontanément. En revanche, la formule « fais un git » autorise en une seule instruction la vérification du périmètre, la création d'un commit au message détaillé et le push immédiat de la branche active, sans seconde confirmation.

**Raison** — Cette convention évite les confirmations répétitives tout en laissant au propriétaire l'initiative de la publication du travail.

**Vérifications associées** — Lors d'un « fais un git », ne pas lancer de compilation, de smoke test, de diagnostic réel ou d'autres vérifications superflues sauf demande explicite. Effectuer seulement les contrôles Git nécessaires pour délimiter et enregistrer les changements.

**Exception pour les tags** — Un tag `v*` déclenche une publication Windows. La création ou le push d'un tag exige donc une demande explicite mentionnant le tag ou la publication et n'est pas incluse dans la formule « fais un git ».

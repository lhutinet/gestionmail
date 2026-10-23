# GestionMail

Client de messagerie Windows indépendant, orienté stockage local et simplicité.

## État actuel

Le premier socle comprend :

- une application Electron sécurisée (`contextIsolation`, sandbox et CSP) ;
- l'interface principale de la boîte mail ;
- l'ajout de comptes IMAP ou POP3 et du serveur SMTP ;
- la validation des paramètres essentiels ;
- le stockage local des comptes ;
- le chiffrement du mot de passe par la protection native de la session Windows.

La version actuelle permet également :

- de tester réellement les connexions IMAP ou POP3 et SMTP avant l'enregistrement ;
- de synchroniser jusqu'aux 50 messages les plus récents de la boîte de réception ;
- d'afficher et de synchroniser séparément les dossiers d'un compte IMAP ;
- d'enregistrer les messages complets dans une base SQLite locale ;
- de lire et rechercher les messages hors connexion ;
- d'envoyer un message texte par SMTP.
- d'enregistrer les pièces jointes reçues et d'ajouter des fichiers aux messages envoyés (25 Mo maximum au total).
- d'afficher les messages HTML après suppression des scripts, styles, liens actifs et images distantes ;
- de répondre à un message ou de le transférer.
- de modifier les paramètres d'un compte sans ressaisir son mot de passe ;
- de supprimer un compte et ses copies locales sans toucher au serveur.
- de synchroniser l'état lu/non lu avec un serveur IMAP ;
- d'archiver un message ou de le déplacer vers la corbeille IMAP détectée.
- d'actualiser automatiquement le dossier ouvert toutes les 1, 5, 15 ou 30 minutes ;
- d'afficher une notification Windows lorsqu'un nouveau message est téléchargé.
- d'organiser les dossiers IMAP sous forme d'arborescence repliable ;
- d'épingler des dossiers serveur dans une zone Favoris propre à chaque compte ;
- de créer des dossiers locaux et d'y copier indépendamment messages et pièces jointes.

Certains fournisseurs, notamment Gmail et Microsoft, peuvent exiger OAuth2 ou un mot de passe d'application. OAuth2 n'est pas encore intégré.

## Démarrage

```powershell
npm.cmd install
npm.cmd start
```

## Distribution Windows

```powershell
npm.cmd run dist:win
```

Les exécutables x64 sont générés dans `dist` : un assistant d'installation NSIS et une version portable.
Ils ne sont pas signés numériquement tant qu'aucun certificat de signature de code n'est configuré.

## Organisation

- `src/main` : processus principal Electron, accès au système et données locales ;
- `src/renderer` : interface utilisateur isolée ;
- les données utilisateur sont enregistrées dans le dossier applicatif Windows d'Electron, jamais dans le dépôt.


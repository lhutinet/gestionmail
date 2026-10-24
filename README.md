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
- d'afficher les dossiers locaux dans une bande verticale séparée, à gauche des dossiers serveur ;
- de glisser-déposer un message directement sur un dossier local pour le conserver.
- d'ouvrir les paramètres depuis la roue dentée en bas à gauche ;
- de gérer l'ajout, la modification et la suppression des comptes dans Paramètres, avec un sélecteur compact dans la navigation ;
- de choisir l'emplacement de la base locale sans supprimer automatiquement l'ancienne copie de sécurité.
- de copier récursivement un dossier serveur et toute son arborescence vers les dossiers locaux, avec progression et annulation ;
- de déplacer les dossiers locaux comme des dossiers Windows, de compter leur contenu récursivement et de supprimer une arborescence complète ;
- d'effectuer une recherche globale, de sélectionner plusieurs messages et de leur appliquer une action groupée ;
- d'enregistrer automatiquement les brouillons et de conserver une copie locale des messages envoyés ;
- de classer automatiquement les nouveaux messages avec des règles par expéditeur, destinataire, objet ou contenu ;
- de gérer des contacts et des groupes, avec import/export CSV ou vCard et fusion des doublons ;
- de rédiger en HTML avec modèles, signature par compte, images intégrées et vérification orthographique ;
- de conserver une liste TODO locale depuis le bouton discret en bas à gauche ;
- de rouvrir automatiquement le dernier compte et le dernier dossier consultés ;
- de redimensionner les colonnes principales.
- de choisir la taille générale du texte et la couleur principale de l’interface depuis les paramètres ;
- d’adapter automatiquement les contrastes du thème, y compris dans les fenêtres de message séparées ;
- de réduire l’application dans la zone de notification Windows et de la piloter depuis son petit menu.
- de mesurer le démarrage, d’indexer les fichiers `.eml` en arrière-plan et de différer la connexion IMAP en affichant d’abord les données locales ;
- de regrouper les messages par conversation avec dépliage, et d’effectuer une recherche avancée par date, expéditeur, pièces jointes et état de lecture ;
- de renommer, dupliquer et déplacer les dossiers locaux depuis leur menu contextuel ;
- de créer et restaurer une sauvegarde complète des comptes, réglages, contacts, règles, messages et dossiers locaux ;
- d’afficher le nombre de messages non lus dans l’icône de notification et sur l’icône de la barre des tâches ;
- de connecter Gmail et Microsoft en OAuth2 avec PKCE et stockage chiffré des jetons ;
- de rechercher, télécharger puis installer explicitement les versions publiées sur le dépôt GitHub officiel.

Certains fournisseurs, notamment Gmail et Microsoft, peuvent exiger OAuth2 ou un mot de passe d’application. GestionMail prend désormais en charge OAuth2 pour leurs connexions IMAP et SMTP.
Pour OAuth2, créez une application de type bureau chez Google Cloud ou Microsoft Entra, puis saisissez son identifiant client dans la fiche du compte. Le retour OAuth utilise une adresse locale temporaire `127.0.0.1` et les jetons sont chiffrés par la protection native de Windows.

## Sauvegardes

La page Paramètres permet de créer une sauvegarde dans un nouveau dossier et de la restaurer. La restauration redémarre l’application et conserve automatiquement les données remplacées dans un dossier `avant-restauration-*`.

## Mises à jour

Les mises à jour utilisent les versions publiques du dépôt GitHub `lhutinet/gestionmail`. La recherche peut être automatique, mais le téléchargement et l’installation restent des actions explicites. Seule la version NSIS installée est actualisable ; la version portable doit être remplacée manuellement.

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


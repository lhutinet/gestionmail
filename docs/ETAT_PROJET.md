# État du projet Monmail

État constaté par découverte ciblée le 9 novembre 2026 sur la branche `master`, au commit `c2a2d7c`. Le code et l'historique Git ont été privilégiés par rapport aux affirmations documentaires.

## Ce qui fonctionne actuellement

Les éléments suivants sont présents dans l'implémentation et couverts totalement ou partiellement par le smoke test intégré :

- démarrage d'une application Electron isolée avec fenêtre principale, fenêtres de message et tray Windows ;
- ajout, modification, test et suppression locale de comptes IMAP ou POP3 avec SMTP ;
- chiffrement Windows des mots de passe et jetons OAuth2 ;
- OAuth2 PKCE pour Google et Microsoft ;
- synchronisation des messages et dossiers IMAP, récupération POP3 et envoi SMTP ;
- stockage hors connexion dans SQLite et fichiers EML locaux ;
- lecture texte/HTML avec assainissement, pièces jointes, réponses et transferts ;
- état lu/non lu, copie, déplacement, archivage et suppression distante en IMAP ;
- recherche globale et avancée, conversations et actions groupées ;
- contacts, groupes, import/export CSV ou vCard et fusion des doublons ;
- brouillons automatiques, messages envoyés, signatures, modèles et rédaction HTML ;
- règles de tri, favoris, dossiers locaux et copie d'arborescences serveur ;
- TODO locale enrichie des idées OVH partagées à traiter, apparence personnalisable, notifications et synchronisation périodique ;
- interface de boîte à idées anonyme : chaque poste retrouve localement ses propres propositions, tandis que la liste complète et son traitement exigent la connexion administrateur placée à la fin des paramètres ;
- sauvegarde complète, validation et restauration avec copie de récupération ;
- recherche et installation explicite des mises à jour publiées sur GitHub.

Le 9 novembre 2026, `npm.cmd run check` et `npm.cmd run smoke` ont réussi avec Node.js 22.18.0. Le smoke test s'est terminé avec un code 0 ; Chromium a seulement affiché des avertissements GPU lors de sa fermeture.

## Travail terminé ou intégré

- La version déclarée est `1.0.3`.
- `TODO.md` et `todos.json` contiennent 11 tâches terminées et aucune tâche ouverte.
- Les derniers commits intègrent notamment la publication 1.0.x, la TODO locale, la sécurité IMAP, la lecture HTML, les liens de courriels et les apparences personnalisables.
- Le workflow de Release Windows est en place pour les tags `v*`.
- L'installateur NSIS et la version portable x64 sont configurés dans `package.json`.
- Le dépôt local `master` était aligné sur `origin/master` et propre avant la création de cette mémoire.

## Ce qui reste à faire ou à décider

Aucune tâche ouverte n'est suivie dans `TODO.md`. Les points suivants sont des besoins de maintenance observés, pas des engagements fonctionnels confirmés :

- décider si une suite de tests séparée et un lint doivent compléter le smoke test monolithique ;
- décider si les gros fichiers `main.js`, `message-store.js` et `renderer/app.js` doivent être découpés ; une telle refactorisation doit rester progressive ;
- traiter les alertes de dépendances après analyse de compatibilité : `npm install` a signalé six vulnérabilités modérées le 9 novembre 2026 ;
- configurer éventuellement une signature de code Windows si la distribution publique doit éviter les avertissements liés aux exécutables non signés ;
- maintenir la documentation lors des prochaines fonctions, car la liste du README est longue et le TODO actuel est entièrement clôturé.
- maintenir le déploiement `server/ideas-api` sur le VPS OVH et renseigner `ideasApiUrl` sur chaque poste Monmail à partir de `config/machine.example.json`.

## Problèmes connus et points incertains

- Le lancement interactif complet n'a pas pu être observé depuis l'identité isolée de Codex : cette identité n'avait pas accès au cache du profil Windows réel. Le smoke test isolé réussit. Il ne s'agit donc pas d'un défaut applicatif confirmé.
- Le diagnostic réel n'a pas été exécuté : les connexions IMAP/POP3/SMTP, les fournisseurs OAuth et les données réelles n'ont pas été testés pendant cette découverte.
- L'API d'idées est déployée sur le VPS OVH, reliée à sa base PostgreSQL dédiée et publiée sur `https://idees.digitalh.fr`. La liste globale refuse désormais les accès anonymes ; une preuve locale incorrecte ne restitue aucune idée et l’accès administrateur continue de fonctionner. Le propriétaire doit encore définir le premier mot de passe depuis le poste d’amorçage ; aucun test de charge n'a été effectué.
- La construction `dist:win` et le workflow GitHub Actions n'ont pas été exécutés pendant cette tâche.
- Les fichiers affichés dans le terminal ont parfois présenté des caractères français mal décodés. La cause probable est l'encodage d'affichage de la console, mais l'intégrité d'encodage de chaque ancien fichier n'a pas été auditée.
- Les identifiants clients OAuth, les autorisations des applications Google/Microsoft et la configuration des serveurs mail sont externes au dépôt et restent à fournir par l'utilisateur.
- La disponibilité de `node:sqlite` lie le projet à une version de Node/Electron suffisamment récente. Le workflow fixe Node 22, mais `package.json` ne déclare pas de champ `engines`.

## Limitations actuelles

- L'application cible Windows x64 ; aucune cible macOS ou Linux n'est configurée.
- Les données sont locales à la session Windows et ne sont pas synchronisées entre plusieurs ordinateurs par Monmail.
- Les capacités de classement distant exigent IMAP ; POP3 ne permet pas les mêmes opérations serveur.
- La sécurité des connexions et l'authentification dépendent des serveurs mail et des applications OAuth configurés par l'utilisateur.
- Le smoke test est intégré au point d'entrée principal plutôt que réparti en tests unitaires ou d'intégration dédiés.
- Aucun script de lint n'est déclaré.
- Les exécutables ne sont pas signés numériquement dans la configuration suivie.
- La version portable doit être remplacée manuellement pour une mise à jour.

## État Git observé

- Branche active : `master`.
- Suivi : `origin/master`.
- Dépôt distant : `https://github.com/lhutinet/gestionmail.git`.
- Commit observé avant cette mémoire : `c2a2d7c` du 7 novembre 2026.
- L’API de la boîte à idées a été déployée sur OVH le 9 novembre 2026. La version applicative `1.0.3` regroupe son intégration et sa mémoire durable ; aucun tag de publication Windows n’a été créé.

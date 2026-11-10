# API de la boîte à idées

Cette API Node.js enregistre les propositions anonymes dans PostgreSQL. Elle doit être placée derrière le reverse proxy HTTPS déjà utilisé sur le serveur OVH. PostgreSQL ne doit pas être exposé sur Internet.

## Préparation

1. Créer une base et un utilisateur PostgreSQL dédiés à Monmail.
2. Exécuter `schema.sql` dans cette base.
3. Copier `.env.example` vers un fichier d'environnement non versionné et définir `DATABASE_URL`.
4. Construire l'image avec `docker build -t monmail-ideas-api .`, ou installer les dépendances avec `npm ci` pour un service systemd.
5. Démarrer le conteneur avec le fichier d'environnement non versionné et le connecter au réseau permettant d'atteindre PostgreSQL. Le nom de ce réseau dépend de l'installation Umami existante.
6. Faire pointer un sous-domaine HTTPS vers `127.0.0.1:3001` avec Nginx ou le reverse proxy existant.

Sur le VPS Digital H actuel, `deploy-ovh.sh` crée un rôle et une base `monmail_ideas` dans le conteneur `umami-db`, génère un mot de passe local dans `.env` et un jeton dans `.admin-token`, applique le schéma puis démarre l'API sur le réseau Docker `umami_default`. Ces deux fichiers restent non versionnés et privés. Le fichier `idees.digitalh.fr.nginx` fournit la route Nginx avant activation du certificat Certbot.

`DEFAULT_IDEA_STATUS=published` affiche immédiatement les propositions. La valeur `pending` les conserve pour une modération directe dans PostgreSQL avant publication.

## Configuration facultative de Monmail

Monmail utilise par défaut `https://idees.digitalh.fr`. Aucun réglage n’est nécessaire sur un nouveau PC pour accéder à la boîte à idées.

Pour utiliser une autre API, créer `%ProgramData%\Monmail\machine.json` sur le poste concerné :

```json
{
  "ideasApiUrl": "https://idees.example.fr"
}
```

Le même fichier peut conserver la propriété `todoDirectory` déjà prise en charge. Aucun identifiant PostgreSQL ne doit être copié dans Monmail.

La proposition est publique, mais la liste globale exige une authentification administrateur. Chaque réponse de création contient une preuve aléatoire que Monmail conserve localement afin que l’utilisateur retrouve uniquement ses propres propositions aux ouvertures suivantes. Le serveur ne conserve que l’empreinte de cette preuve.

Le poste d’amorçage reçoit exceptionnellement `.admin-token` dans `%ProgramData%\Monmail\ideas-admin-token`, avec des permissions limitées au compte Windows concerné, au système et aux administrateurs. Depuis ce poste, la section « Administration de la boîte à idées », à la fin des paramètres, définit le mot de passe partagé. Les autres postes utilisent ensuite « Connexion administrateur » au même emplacement ; leur jeton de session reste uniquement en mémoire jusqu’à la fermeture de Monmail. Ne jamais copier `.admin-token` vers les autres postes, Git ou l’application distribuée.

#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"
umask 077

if [ ! -f .env ]; then
  database_password="$(openssl rand -hex 24)"
  {
    printf 'DATABASE_URL=postgresql://monmail_ideas:%s@umami-db:5432/monmail_ideas\n' "$database_password"
    printf 'DEFAULT_IDEA_STATUS=published\n'
    printf 'PUBLIC_ORIGIN=\n'
  } > .env
else
  database_password="$(sed -n 's#^DATABASE_URL=postgresql://monmail_ideas:\([^@]*\)@.*#\1#p' .env)"
fi

if [ ! -f .admin-token ]; then
  openssl rand -hex 32 > .admin-token
fi
admin_token="$(cat .admin-token)"
if [ "${#admin_token}" -ne 64 ]; then
  echo 'Jeton administrateur absent ou invalide.' >&2
  exit 1
fi
case "$admin_token" in
  ''|*[!0-9a-f]*)
    echo 'Jeton administrateur absent ou invalide.' >&2
    exit 1
    ;;
esac
if grep -q '^ADMIN_TOKEN=' .env; then
  sed -i "s/^ADMIN_TOKEN=.*/ADMIN_TOKEN=$admin_token/" .env
else
  printf 'ADMIN_TOKEN=%s\n' "$admin_token" >> .env
fi
chmod 600 .env .admin-token
mkdir -p admin-data
chmod 700 admin-data

case "$database_password" in
  ''|*[!0-9a-f]*)
    echo 'Mot de passe DATABASE_URL absent ou invalide.' >&2
    exit 1
    ;;
esac

postgres_user="$(docker exec umami-db printenv POSTGRES_USER)"
postgres_database="$(docker exec umami-db printenv POSTGRES_DB)"

if ! docker exec umami-db psql -U "$postgres_user" -d "$postgres_database" -tAc "SELECT 1 FROM pg_roles WHERE rolname='monmail_ideas'" | grep -q 1; then
  docker exec umami-db psql -v ON_ERROR_STOP=1 -U "$postgres_user" -d "$postgres_database" -c "CREATE ROLE monmail_ideas LOGIN PASSWORD '$database_password'"
else
  docker exec umami-db psql -v ON_ERROR_STOP=1 -U "$postgres_user" -d "$postgres_database" -c "ALTER ROLE monmail_ideas PASSWORD '$database_password'"
fi

if ! docker exec umami-db psql -U "$postgres_user" -d "$postgres_database" -tAc "SELECT 1 FROM pg_database WHERE datname='monmail_ideas'" | grep -q 1; then
  docker exec umami-db psql -v ON_ERROR_STOP=1 -U "$postgres_user" -d "$postgres_database" -c "CREATE DATABASE monmail_ideas OWNER monmail_ideas"
fi

docker exec -e PGPASSWORD="$database_password" -i umami-db psql -v ON_ERROR_STOP=1 -U monmail_ideas -d monmail_ideas < schema.sql
docker compose up -d --build

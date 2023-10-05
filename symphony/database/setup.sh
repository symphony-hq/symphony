#!/bin/bash

# Check if PostgreSQL and PostgREST are installed
command -v psql >/dev/null 2>&1 || { echo >&2 "PostgreSQL is not installed. Please install it and try again. Aborting."; exit 1; }
command -v postgrest >/dev/null 2>&1 || { echo >&2 "PostgREST is not installed. Please install it and try again. Aborting."; exit 1; }

# Database connection details
DB_NAME="symphony"
DB_HOST="localhost"
DB_PORT="5432"
DB_ROLE="anon"

# Check if database already exists
if psql -h $DB_HOST -p $DB_PORT -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
   echo "Database $DB_NAME already exists, skipping setup."
   exit
fi

# Create database
psql -h $DB_HOST -p $DB_PORT -c "CREATE DATABASE $DB_NAME;"

# Add pgcrypto extension to the database
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Create role
psql -h $DB_HOST -p $DB_PORT -c "CREATE ROLE $DB_ROLE nologin;"

# SQL commands
SQL_COMMANDS="
create table public.generations (
  id uuid not null default gen_random_uuid(), 
  \"conversationId\" uuid not null, 
  timestamp timestamp with time zone null default (now() at time zone 'utc'::text), 
  message json not null, 
  constraint messages_pkey primary key (id)
);
grant all on public.generations to anon;
"

# Execute SQL commands
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "$SQL_COMMANDS"
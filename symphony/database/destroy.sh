#!/bin/bash

# Database connection details
DB_NAME="symphony"
DB_HOST="localhost"
DB_PORT="5432"
DB_ROLE="anon"

# Drop database
psql -h $DB_HOST -p $DB_PORT -c "DROP DATABASE IF EXISTS $DB_NAME;"

# Drop role
psql -h $DB_HOST -p $DB_PORT -c "DROP ROLE IF EXISTS $DB_ROLE;"
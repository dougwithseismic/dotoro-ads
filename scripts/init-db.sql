-- Database initialization script
-- This runs when the container is first created

-- Create extensions that might be useful
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant all privileges to postgres user on the dotoro database
GRANT ALL PRIVILEGES ON DATABASE dotoro TO postgres;

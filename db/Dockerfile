FROM postgis/postgis:15-3.4

# Install pgvector extension and osm2pgsql for geocoding
RUN apt-get update && \
    apt-get install -y postgresql-15-pgvector osm2pgsql && \
    rm -rf /var/lib/apt/lists/*

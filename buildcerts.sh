#!/bin/bash
rm -rf cert
mkdir cert

# Set the wildcarded domain
# we want to use
DOMAIN="NOSUCHDOMAINEVERINHISTORY"

# A blank passphrase
PASSPHRASE="extremelysecurepassphrase!"

# Set our CSR variables
SUBJ="
C=US
ST=Oregon
O=
localityName=Eugene
commonName=$DOMAIN
organizationalUnitName=
emailAddress=
"

# Generate our Private Key, CSR and Certificate
openssl genrsa -out "cert/my-server.key.pem" 2048
openssl req -new -subj "$(echo -n "$SUBJ" | tr "\n" "/")" -key "cert/my-server.key.pem" -out "cert/my-server.csr.pem" -passin pass:$PASSPHRASE
openssl x509 -req -days 365 -in "cert/my-server.csr.pem" -signkey "cert/my-server.key.pem" -out "cert/my-server.crt.pem"
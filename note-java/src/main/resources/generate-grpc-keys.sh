#!/usr/bin/env bash
if [ ! -f grpc.crt ]; then
  # Create a root CA certificate
  openssl req -newkey rsa:2048 -nodes -keyout grpc.key -x509 -days 365 -out grpc.crt
fi

# Create a certificate for note-java
openssl genrsa -out note-java.key 2048
openssl req -new -key note-java.key -out note-java.csr
openssl x509 -req -in note-java.csr -CA grpc.crt -CAkey grpc.key -CAcreateserial -out note-java.crt -days 365 

# Netty requires pkcs8
openssl pkcs8 -topk8 -nocrypt -out note-java.pfx -in note-java.key

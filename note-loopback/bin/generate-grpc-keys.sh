#!/usr/bin/env bash
if [ ! -f grpc.crt ]; then
  # Create a root CA certificate
  openssl req -newkey rsa:2048 -nodes -keyout grpc.key -x509 -days 365 -out grpc.crt
fi

# Create a certificate for note-loopback
openssl genrsa -out note-loopback.key 2048
openssl req -new -key note-loopback.key -out note-loopback.csr
openssl x509 -req -in note-loopback.csr -CA grpc.crt -CAkey grpc.key -CAcreateserial -out note-loopback.crt -days 365

# Netty requires pkcs8
openssl pkcs8 -topk8 -nocrypt -out note-loopback.pfx -in note-loopback.key

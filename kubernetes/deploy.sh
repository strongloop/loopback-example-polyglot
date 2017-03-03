#!/bin/bash

# Create deployments
kubectl apply -f note-swift-deployment.yaml
kubectl apply -f note-java-deployment.yaml
kubectl apply -f note-loopback-deployment.yaml
kubectl apply -f note-mongo-deployment.yaml
kubectl apply -f zipkin-deployment.yaml

# Create services
kubectl apply -f note-swift-service.yaml
kubectl apply -f note-java-service.yaml
kubectl apply -f note-loopback-service.yaml
kubectl apply -f note-mongo-service.yaml
kubectl apply -f zipkin-service.yaml



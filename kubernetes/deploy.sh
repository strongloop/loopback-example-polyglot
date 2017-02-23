#!/bin/bash

# Create deployments
kubectl create -f note-swift-deployment.yaml
kubectl create -f note-java-deployment.yaml
kubectl create -f note-loopback-deployment.yaml
kubectl create -f note-mongo-deployment.yaml
kubectl create -f zipkin-deployment.yaml

# Create services
kubectl create -f note-swift-service.yaml
kubectl create -f note-java-service.yaml
kubectl create -f note-loopback-service.yaml
kubectl create -f note-mongo-service.yaml
kubectl create -f zipkin-service.yaml



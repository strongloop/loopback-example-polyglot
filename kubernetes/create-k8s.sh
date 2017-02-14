#!/bin/bash
# Start minikube
minikube start

# Create deployments
kubectl create -f note-swift-deployment.yml
kubectl create -f note-java-deployment.yml
kubectl create -f note-loopback-deployment.yml
kubectl create -f note-mongo-deployment.yml
kubectl create -f zipkin-deployment.yml

# Create services
kubectl create -f note-swift-service.yml
kubectl create -f note-java-service.yml
kubectl create -f note-loopback-service.yml
kubectl create -f note-mongo-service.yml
kubectl create -f zipkin-service.yml

# Start dashboard
minikube dashboard

# Open note-loopback
minikube service note-loopback


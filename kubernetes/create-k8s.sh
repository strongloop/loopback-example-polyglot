#!/bin/bash
# Start minikube
minikube start

# Create deployments/services
kubectl create -f note-app.yaml

# Start dashboard
minikube dashboard

# Open note-loopback
minikube service note-loopback


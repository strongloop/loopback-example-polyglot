#!/bin/bash
minikube start
kubectl create -f note-swift-deployment.yml
kubectl create -f note-java-deployment.yml
kubectl create -f note-loopback-deployment.yml
kubectl create -f note-zipkin-deployment.yml
kubectl create -f note-swift-service.yml
kubectl create -f note-java-service.yml
kubectl create -f note-loopback-service.yml
kubectl create -f note-zipkin-service.yml
kubectl service note-loopback


#!/bin/bash

echo "Deploying to Kubernetes..."

# Apply configurations
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/

echo "Deployment complete!"
echo "Check status: kubectl get all -n chat-app"

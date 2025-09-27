#!/bin/bash

echo "Creating Kubernetes configurations..."

mkdir -p infrastructure/kubernetes

# Namespace
cat > infrastructure/kubernetes/namespace.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: chat-app
EOF

# ConfigMap
cat > infrastructure/kubernetes/configmap.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: chat-app-config
  namespace: chat-app
data:
  NODE_ENV: "production"
  CORS_ORIGIN: "https://chat.example.com"
  KAFKA_BROKERS: "kafka-service:9092"
  REDIS_URL: "redis://redis-service:6379"
  MONGODB_URL: "mongodb://mongodb-service:27017/chatapp"
  DATABASE_URL: "postgresql://chatuser:chatpass123@postgresql-service:5432/chatapp"
EOF

# API Gateway Deployment
cat > infrastructure/kubernetes/api-gateway.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: chat-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: chat-app/api-gateway:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: chat-app-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: chat-app
spec:
  selector:
    app: api-gateway
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
EOF

# User Service Deployment
cat > infrastructure/kubernetes/user-service.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: chat-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: chat-app/user-service:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: chat-app-config
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: chat-app
spec:
  selector:
    app: user-service
  ports:
  - port: 3001
    targetPort: 3001
EOF

# Message Service Deployment
cat > infrastructure/kubernetes/message-service.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: message-service
  namespace: chat-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: message-service
  template:
    metadata:
      labels:
        app: message-service
    spec:
      containers:
      - name: message-service
        image: chat-app/message-service:latest
        ports:
        - containerPort: 3002
        envFrom:
        - configMapRef:
            name: chat-app-config
---
apiVersion: v1
kind: Service
metadata:
  name: message-service
  namespace: chat-app
spec:
  selector:
    app: message-service
  ports:
  - port: 3002
    targetPort: 3002
EOF

# Frontend Deployment
cat > infrastructure/kubernetes/frontend.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: chat-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: chat-app/frontend:latest
        ports:
        - containerPort: 3006
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.chat.example.com"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: chat-app
spec:
  selector:
    app: frontend
  ports:
  - port: 3006
    targetPort: 3006
  type: LoadBalancer
EOF

# HPA for auto-scaling
cat > infrastructure/kubernetes/hpa.yaml << 'EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: chat-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: message-service-hpa
  namespace: chat-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: message-service
  minReplicas: 3
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
EOF

# Deployment script
cat > scripts/deploy-k8s.sh << 'EOF'
#!/bin/bash

echo "Deploying to Kubernetes..."

# Apply configurations
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/

echo "Deployment complete!"
echo "Check status: kubectl get all -n chat-app"
EOF

chmod +x scripts/deploy-k8s.sh

echo "Kubernetes configurations created successfully!"
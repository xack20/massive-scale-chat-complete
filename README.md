# 🚀 Massive Scale Chat Application

A production-ready, scalable real-time chat application built with microservices architecture, capable of handling 100,000+ concurrent users.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-black)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20TypeScript-green)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20MongoDB%20%7C%20Redis-red)
![Message Queue](https://img.shields.io/badge/Message%20Queue-Apache%20Kafka-orange)
![Load Balancer](https://img.shields.io/badge/Load%20Balancer-HAProxy-lightgrey)

## ✨ Features

### 🎯 Core Chat Features
- **Real-time Messaging** - Instant message delivery with Socket.IO
- **File Sharing** - Upload and share documents, images, videos (up to 50MB)
- **Voice & Video Calls** - WebRTC-powered HD voice/video communication
- **Message Threading** - Organize conversations with threaded replies
- **Emoji Reactions** - React to messages with emojis
- **Typing Indicators** - See when someone is typing
- **User Presence** - Online/offline status and activity tracking
- **Search & Filters** - Advanced message and user search capabilities
- **Push Notifications** - Real-time notifications via email and push services

### 🏗️ Technical Features
- **Microservices Architecture** - 6 independent, scalable services
- **Horizontal Scaling** - Handle 100K+ concurrent connections
- **Load Balancing** - HAProxy with sticky sessions for WebSocket connections
- **Message Queuing** - Apache Kafka for reliable message processing
- **Caching** - Redis for session management and real-time data
- **File Storage** - MinIO S3-compatible object storage
- **Container Orchestration** - Docker Compose for development, Kubernetes for production
- **Monitoring & Observability** - Prometheus, Grafana, and comprehensive logging
- **Security** - JWT authentication, rate limiting, input validation
- **Testing** - Unit tests with Jest, E2E tests with Playwright

## 🏛️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────────────────────────────┐
│   Frontend      │    │             Load Balancer                 │
│   (Next.js)     │◄──►│              (HAProxy)                   │
│   Port: 3006    │    │              Port: 80                    │
└─────────────────┘    └──────────────────┬───────────────────────┘
                                          │
                       ┌──────────────────▼───────────────────────┐
                       │           API Gateway                     │
                       │           Port: 3000                     │
                       └─────────┬────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼──────┐    ┌───────────▼──────┐    ┌──────────▼─────────┐
│ User Service │    │ Message Service  │    │  File Service      │
│  Port: 3001  │    │   Port: 3002     │    │   Port: 3003       │
└──────────────┘    └──────────────────┘    └────────────────────┘
        │                        │                        │
┌───────▼──────┐    ┌───────────▼──────┐    ┌──────────▼─────────┐
│Notification  │    │ Presence Service │    │     Databases      │
│   Service    │    │   Port: 3005     │    │ PostgreSQL, MongoDB│
│  Port: 3004  │    │                  │    │ Redis, Kafka       │
└──────────────┘    └──────────────────┘    └────────────────────┘
```

### Service Breakdown

| Service | Technology | Database | Purpose |
|---------|------------|----------|---------|
| **API Gateway** | Node.js, Express | PostgreSQL | Request routing, authentication, rate limiting |
| **User Service** | Node.js, Prisma | PostgreSQL | User management, authentication, profiles |
| **Message Service** | Node.js, Mongoose | MongoDB | Real-time messaging, message history |
| **File Service** | Node.js, Multer | MongoDB + MinIO | File upload, processing, storage |
| **Notification Service** | Node.js, Nodemailer | Redis | Email, push notifications |
| **Presence Service** | Node.js, Socket.IO | Redis | User presence, typing indicators |

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time communication
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Framer Motion** - Animations
- **Simple Peer** - WebRTC implementation

### Backend Services
- **Node.js 20+** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **Prisma** - PostgreSQL ORM
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **Winston** - Logging

### Infrastructure
- **PostgreSQL 15** - User data and authentication
- **MongoDB 7** - Messages and file metadata
- **Redis 7** - Caching and session management
- **Apache Kafka** - Message queue and event streaming
- **MinIO** - S3-compatible object storage
- **HAProxy** - Load balancer with sticky sessions
- **Docker & Docker Compose** - Containerization
- **Kubernetes** - Production orchestration

### Monitoring & DevOps
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Jest** - Unit testing
- **Playwright** - E2E testing
- **GitHub Actions** - CI/CD pipeline

## 🚀 Quick Start

### Prerequisites

- **Docker** 24.0+ and **Docker Compose** 2.0+
- **Node.js** 18+ (optional, for local development)
- **Git**

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd massive-scale-chat
```

### 2. Automated Setup

Run the automated setup script:

```bash
# Make setup script executable (if needed)
chmod +x setup.sh

# Run setup - this will:
# - Check dependencies
# - Create environment files
# - Set up Docker networks and volumes
# - Initialize databases and services
# - Create Kafka topics and MinIO buckets
./setup.sh
```

### 3. Start Development Environment

```bash
# Start all services
./start-dev.sh

# Or use npm scripts
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3006
- **API Gateway**: http://localhost/api
- **HAProxy Stats**: http://localhost:8080
- **MinIO Console**: http://localhost:9001

## 📋 Environment Configuration

### Root `.env` File
Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Key configurations:
- **Database URLs** - PostgreSQL, MongoDB, Redis connections
- **JWT Secret** - For authentication tokens
- **File Storage** - MinIO configuration
- **External Services** - SendGrid (email), Firebase (push notifications)

### Frontend `.env.local`
The setup script automatically creates this file:

```bash
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_WS_URL=ws://localhost/ws
NEXT_PUBLIC_FILE_UPLOAD_URL=http://localhost/api/files
```

## 🐳 Docker Commands

### Development Commands

```bash
# Start all services
npm run docker:up
# or
./start-dev.sh

# Stop all services
npm run docker:down
# or
./start-dev.sh stop

# View logs
npm run docker:logs
# or
./start-dev.sh logs

# Check service status
./start-dev.sh status

# Run health checks
./start-dev.sh health

# Restart services
./start-dev.sh restart

# Clean up everything (removes volumes)
./start-dev.sh cleanup
```

### Manual Docker Compose

```bash
# Start infrastructure only
docker compose up -d postgresql mongodb redis kafka zookeeper minio

# Start application services
docker compose up -d api-gateway user-service message-service file-service notification-service presence-service

# Start frontend and load balancer
docker compose up -d frontend haproxy

# Start everything
docker compose up -d

# Stop everything
docker compose down

# Clean up with volumes
docker compose down -v
```

## 🧪 Development Workflow

### Local Development

1. **Install Dependencies**:
```bash
npm install
cd frontend && npm install
cd ../services/api-gateway && npm install
# ... repeat for other services
```

2. **Run Individual Services**:
```bash
# Start infrastructure
docker compose up -d postgresql mongodb redis kafka zookeeper minio

# Run a service locally
cd services/user-service
npm run dev
```

3. **Frontend Development**:
```bash
cd frontend
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run frontend tests
cd frontend && npm test

# Run E2E tests
cd frontend && npm run test:e2e

# Run service tests
cd services/user-service && npm test
```

### Building for Production

```bash
# Build all services
npm run build

# Build individual service
cd services/api-gateway && npm run build

# Build frontend
cd frontend && npm run build
```

## 🔧 Service Configuration

### API Gateway (Port 3000)
- **Routes**: Proxies requests to appropriate services
- **Authentication**: JWT token validation
- **Rate Limiting**: Per-user request limits
- **CORS**: Cross-origin request handling

### User Service (Port 3001)
- **Database**: PostgreSQL with Prisma ORM
- **Features**: Registration, login, profile management
- **Authentication**: JWT token generation
- **Validation**: Input validation and sanitization

### Message Service (Port 3002)
- **Database**: MongoDB for message storage
- **Real-time**: Socket.IO for instant messaging
- **Features**: Message CRUD, threading, reactions
- **Kafka**: Message event publishing

### File Service (Port 3003)
- **Storage**: MinIO S3-compatible storage
- **Database**: MongoDB for file metadata
- **Features**: Upload, download, thumbnail generation
- **Security**: File type validation, size limits

### Notification Service (Port 3004)
- **Email**: SendGrid integration
- **Push**: Firebase Cloud Messaging
- **Features**: Real-time notifications, email alerts
- **Queue**: Kafka message consumption

### Presence Service (Port 3005)
- **Real-time**: Socket.IO for presence tracking
- **Features**: Online status, typing indicators
- **Storage**: Redis for temporary presence data

## 🌐 Production Deployment

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
npm run k8s:deploy

# Or manually
kubectl apply -f infrastructure/kubernetes/
```

### Environment Variables for Production

Update your production `.env` with:
- Secure JWT secrets
- Production database URLs
- External service API keys
- Proper CORS origins

### Monitoring Setup

```bash
# Set up monitoring stack
npm run monitoring

# Or manually
./scripts/setup-monitoring.sh
```

## 🔍 Monitoring & Observability

### Prometheus Metrics
- HTTP request metrics
- Database connection pools
- Message queue statistics
- Custom business metrics

### Grafana Dashboards
- System overview
- Service-specific dashboards
- Alert configurations

### Logging
- Structured logging with Winston
- Centralized log aggregation
- Error tracking and alerts

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Secure password hashing
- Session management

### API Security
- Rate limiting per endpoint
- Input validation and sanitization
- CORS configuration
- Security headers

### Data Protection
- Encrypted data transmission
- Secure file upload validation
- SQL injection prevention
- XSS protection

## 📊 Performance & Scalability

### Horizontal Scaling
- **Load Balancer**: HAProxy with sticky sessions
- **Database Sharding**: MongoDB horizontal scaling
- **Kafka Partitioning**: Message queue scaling
- **Redis Clustering**: Cache layer scaling

### Performance Optimizations
- **Connection Pooling**: Database connection management
- **Caching**: Redis for session and frequently accessed data
- **CDN**: Static asset delivery
- **Compression**: Response compression

### Capacity Planning
- **Current Capacity**: 10,000 concurrent users per instance
- **Target Capacity**: 100,000+ with horizontal scaling
- **Resource Requirements**: See deployment guides

## 🧪 Testing Strategy

### Unit Tests
```bash
# Run unit tests for all services
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Test service interactions
npm run test:integration
```

### End-to-End Tests
```bash
# Run E2E tests
cd frontend && npm run test:e2e
```

### Load Testing
```bash
# Performance testing scripts
./scripts/load-test.sh
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Run `./setup.sh` to set up development environment
4. Make your changes
5. Run tests: `npm test`
6. Submit a pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

### Pull Request Process
1. Ensure tests pass
2. Update documentation if needed
3. Add changelog entry
4. Request code review

## 🆘 Troubleshooting

### Common Issues

**Docker containers not starting:**
```bash
# Check Docker daemon
docker info

# Check logs
docker compose logs

# Restart Docker service
sudo systemctl restart docker
```

**Port conflicts:**
```bash
# Check what's using ports
sudo lsof -i :3000
sudo lsof -i :5432

# Kill conflicting processes
sudo kill -9 <PID>
```

**Database connection issues:**
```bash
# Check database containers
docker compose ps postgresql mongodb redis

# Test connections
docker exec massive-scale-chat-postgresql-1 pg_isready -U chatuser
docker exec massive-scale-chat-mongodb-1 mongo --eval "db.adminCommand('ismaster')"
```

**Kafka issues:**
```bash
# Check Kafka topics
docker exec massive-scale-chat-kafka-1 kafka-topics --list --bootstrap-server localhost:9092

# Create missing topics
./setup.sh
```

### Getting Help

1. **Check Logs**: `./start-dev.sh logs`
2. **Health Check**: `./start-dev.sh health`
3. **Restart Services**: `./start-dev.sh restart`
4. **Clean Setup**: `./start-dev.sh cleanup && ./setup.sh`

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Socket.IO team for real-time communication
- Apache Kafka for reliable message streaming
- Next.js team for the amazing React framework
- Docker and Kubernetes communities
- All open-source contributors

---

**Built with ❤️ for massive scale real-time communication**

For detailed documentation, visit the [docs](./docs) folder:
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Architecture Details](./docs/ARCHITECTURE.md)
- [Contributing Guide](./docs/CONTRIBUTING.md)

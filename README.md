# High-Throughput Real-Time Analytics Engine

A distributed system built with Node.js, Redis, and PostgreSQL designed to handle 10k+ events per second with sub-second latency.

## 🚀 Key Features
- **High-Throughput Ingestion**: Powered by Fastify and asynchronous buffering.
- **Distributed Rate Limiting**: Atomic sliding window implementation using Redis Sorted Sets and Lua scripting.
- **Message Durability**: Redis Streams used as a distributed message bus for decoupling ingestion from processing.
- **Performance Optimized**: 
  - **Redis Pipelining**: Micro-batching writes to Redis to minimize network RTT.
  - **Bulk Persistance**: SQL batching in the worker service for high-performance DB writes.
- **Observability**: Prometheus & Grafana integration for monitoring event-loop lag and system throughput.

## 🏗️ Architecture
1. **Ingestion Service (Fastify)**: Validates events and writes to Redis Streams.
2. **Redis Stack**: Acts as a rate limiter and a message broker.
3. **Worker Service (Consumer Group)**: Pulls events from Redis and persists them to Postgres.
4. **PostgreSQL**: Long-term storage for analytical queries.

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Fastify
- **In-Memory Store**: Redis (Lua, Streams)
- **Database**: PostgreSQL
- **Load Testing**: k6
- **Monitoring**: Prometheus, Grafana, Docker

## 🚦 How to Run
1. **Start Infrastructure**:
   ```bash
   docker-compose up -d
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Services**:
   - Ingestion: `npm run dev:ingestion`
   - Worker: `npm run dev:worker`

4. **Run Load Test**:
   ```bash
   k6 run tests/load_test.js
   ```

## 📊 Monitoring
- **Redis Insight**: `http://localhost:8001`
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3000`

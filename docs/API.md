# ChainTrace API Documentation

## Overview

The ChainTrace API provides comprehensive access to supply chain traceability data, blockchain integration, IoT sensor data, and zero-knowledge proof verification. This RESTful API enables developers to build applications that interact with the ChainTrace platform.

## Base URL

```
Production: https://api.chaintrace.io/v1
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting an Access Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "manufacturer",
      "organization": "Acme Corp"
    }
  }
}
```

## Products API

### Get All Products

```http
GET /products?page=1&limit=20&category=electronics&search=smartphone
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `category` (optional): Filter by category
- `search` (optional): Search in name and description

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Smartphone Model X",
        "description": "Latest smartphone with advanced features",
        "category": "electronics",
        "manufacturer_id": 1,
        "blockchain_address": "0x1234...",
        "created_at": "2023-05-15T10:00:00Z",
        "updated_at": "2023-05-15T10:00:00Z",
        "is_active": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### Create Product

```http
POST /products
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description",
  "category": "electronics",
  "blockchain_address": "0x1234..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "New Product",
    "description": "Product description",
    "category": "electronics",
    "manufacturer_id": 1,
    "blockchain_address": "0x1234...",
    "created_at": "2023-05-15T10:00:00Z",
    "updated_at": "2023-05-15T10:00:00Z",
    "is_active": true
  }
}
```

### Get Product by ID

```http
GET /products/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Smartphone Model X",
    "description": "Latest smartphone with advanced features",
    "category": "electronics",
    "manufacturer_id": 1,
    "blockchain_address": "0x1234...",
    "created_at": "2023-05-15T10:00:00Z",
    "updated_at": "2023-05-15T10:00:00Z",
    "is_active": true,
    "batches": [
      {
        "id": 1,
        "batch_number": "BATCH001",
        "quantity": 1000,
        "production_date": "2023-05-15T10:00:00Z",
        "is_verified": true
      }
    ]
  }
}
```

## Batches API

### Get All Batches

```http
GET /batches?product_id=1&page=1&limit=20&verified=true
```

**Query Parameters:**
- `product_id` (optional): Filter by product ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `verified` (optional): Filter by verification status

### Create Batch

```http
POST /batches
Content-Type: application/json

{
  "product_id": 1,
  "batch_number": "BATCH002",
  "quantity": 500,
  "raw_materials_hash": "0xabcd...",
  "production_date": "2023-05-15T10:00:00Z"
}
```

### Get Batch Trace History

```http
GET /batches/{id}/traces
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batch_id": 1,
    "traces": [
      {
        "id": 1,
        "action": "Production",
        "location": "Factory A",
        "timestamp": "2023-05-15T10:00:00Z",
        "actor": "Manufacturer",
        "data_hash": "0x1234...",
        "metadata": {
          "temperature": "22°C",
          "humidity": "45%"
        }
      },
      {
        "id": 2,
        "action": "Transport",
        "location": "Warehouse B",
        "timestamp": "2023-05-16T14:30:00Z",
        "actor": "Logistics",
        "data_hash": "0x5678...",
        "metadata": {
          "vehicle_id": "TRUCK001",
          "driver": "John Doe"
        }
      }
    ]
  }
}
```

## IoT Data API

### Get Sensor Data

```http
GET /iot/sensors?batch_id=1&sensor_type=temperature&start_date=2023-05-15&end_date=2023-05-16
```

**Query Parameters:**
- `batch_id` (optional): Filter by batch ID
- `sensor_type` (optional): Filter by sensor type (temperature, humidity, pressure, etc.)
- `start_date` (optional): Start date for data range
- `end_date` (optional): End date for data range
- `limit` (optional): Maximum number of records (default: 1000)

**Response:**
```json
{
  "success": true,
  "data": {
    "sensors": [
      {
        "sensor_id": "TEMP001",
        "sensor_type": "temperature",
        "value": 22.5,
        "unit": "°C",
        "timestamp": "2023-05-15T10:00:00Z",
        "location": {
          "latitude": 40.7128,
          "longitude": -74.0060
        },
        "metadata": {
          "batch_id": 1,
          "vehicle_id": "TRUCK001"
        }
      }
    ],
    "summary": {
      "total_readings": 1440,
      "average_value": 22.3,
      "min_value": 18.5,
      "max_value": 26.1,
      "time_range": {
        "start": "2023-05-15T00:00:00Z",
        "end": "2023-05-15T23:59:59Z"
      }
    }
  }
}
```

### Register IoT Sensor

```http
POST /iot/sensors
Content-Type: application/json

{
  "sensor_id": "TEMP002",
  "sensor_type": "temperature",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "thresholds": {
    "min": 15,
    "max": 30
  },
  "metadata": {
    "batch_id": 1,
    "vehicle_id": "TRUCK002"
  }
}
```

## Blockchain API

### Get Blockchain Transaction

```http
GET /blockchain/transactions/{tx_hash}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tx_hash": "0x1234...",
    "block_number": 12345678,
    "from": "0xabcd...",
    "to": "0xefgh...",
    "value": "0",
    "gas_used": 21000,
    "gas_price": "20000000000",
    "timestamp": "2023-05-15T10:00:00Z",
    "status": "success",
    "contract_address": "0xijkl...",
    "method": "addTraceRecord",
    "parameters": {
      "batchId": 1,
      "action": "Transport",
      "location": "Warehouse B"
    }
  }
}
```

### Submit Data to Blockchain

```http
POST /blockchain/submit
Content-Type: application/json

{
  "contract": "TraceRegistry",
  "method": "addTraceRecord",
  "parameters": {
    "batchId": 1,
    "action": "Quality Check",
    "location": "Factory A",
    "dataHash": "0x1234...",
    "metadata": "Temperature: 22°C, Humidity: 45%"
  }
}
```

## Zero-Knowledge Proofs API

### Generate Proof

```http
POST /zk-proofs/generate
Content-Type: application/json

{
  "circuit_type": "supply_chain_integrity",
  "inputs": {
    "productHash": "0x1234...",
    "batchId": "BATCH001",
    "timestamp": "1640995200",
    "integrityScore": 95,
    "manufacturerId": "MANUF001",
    "rawMaterialsHash": "0xabcd...",
    "productionDataHash": "0xefgh...",
    "qualityChecksHash": "0xijkl...",
    "transportDataHash": "0xmnop...",
    "storageDataHash": "0xqrst..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proof_id": "PROOF_001",
    "proof": {
      "pi_a": ["0x1234...", "0x5678...", "0x9abc..."],
      "pi_b": [["0xdef0...", "0x1234..."], ["0x5678...", "0x9abc..."], ["0xdef0...", "0x1234..."]],
      "pi_c": ["0x5678...", "0x9abc...", "0xdef0..."]
    },
    "public_signals": ["0x1234...", "0x5678...", "0x9abc..."],
    "circuit_hash": "0xabcd...",
    "timestamp": "2023-05-15T10:00:00Z"
  }
}
```

### Verify Proof

```http
POST /zk-proofs/verify
Content-Type: application/json

{
  "proof_id": "PROOF_001",
  "proof": {
    "pi_a": ["0x1234...", "0x5678...", "0x9abc..."],
    "pi_b": [["0xdef0...", "0x1234..."], ["0x5678...", "0x9abc..."], ["0xdef0...", "0x1234..."]],
    "pi_c": ["0x5678...", "0x9abc...", "0xdef0..."]
  },
  "public_signals": ["0x1234...", "0x5678...", "0x9abc..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proof_id": "PROOF_001",
    "is_valid": true,
    "verification_timestamp": "2023-05-15T10:00:00Z"
  }
}
```

## Analytics API

### Get Supply Chain Analytics

```http
GET /analytics/supply-chain?start_date=2023-05-01&end_date=2023-05-31&product_id=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_products": 150,
      "total_batches": 500,
      "total_traces": 2500,
      "verified_batches": 480,
      "integrity_score_avg": 92.5
    },
    "timeline": [
      {
        "date": "2023-05-01",
        "products_created": 5,
        "batches_created": 15,
        "traces_added": 75,
        "avg_integrity_score": 91.2
      }
    ],
    "category_breakdown": [
      {
        "category": "electronics",
        "product_count": 75,
        "batch_count": 250,
        "avg_integrity_score": 94.1
      }
    ],
    "manufacturer_stats": [
      {
        "manufacturer_id": 1,
        "product_count": 50,
        "batch_count": 150,
        "avg_integrity_score": 93.8
      }
    ]
  }
}
```

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2023-05-15T10:00:00Z"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input parameters
- `AUTHENTICATION_ERROR`: Invalid or missing authentication token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `BLOCKCHAIN_ERROR`: Blockchain transaction failed
- `IOT_ERROR`: IoT sensor communication error
- `ZK_PROOF_ERROR`: Zero-knowledge proof generation/verification failed

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour
- **Burst limit**: 50 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## WebSocket API

For real-time data updates, connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket('wss://api.chaintrace.io/ws');

ws.onopen = function() {
  // Subscribe to specific channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'iot_data',
    filters: {
      batch_id: 1,
      sensor_type: 'temperature'
    }
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### WebSocket Message Types

- `sensor_data`: Real-time sensor readings
- `trace_update`: New trace record added
- `batch_verification`: Batch verification status change
- `alert`: System alert or notification
- `proof_generated`: Zero-knowledge proof generated
- `proof_verified`: Zero-knowledge proof verified

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { ChainTraceClient } from '@chaintrace/sdk';

const client = new ChainTraceClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.chaintrace.io/v1'
});

// Get products
const products = await client.products.getAll({
  category: 'electronics',
  limit: 20
});

// Create a new batch
const batch = await client.batches.create({
  product_id: 1,
  batch_number: 'BATCH003',
  quantity: 1000,
  raw_materials_hash: '0x1234...'
});

// Generate zero-knowledge proof
const proof = await client.zkProofs.generate({
  circuit_type: 'supply_chain_integrity',
  inputs: {
    productHash: '0x1234...',
    batchId: 'BATCH003',
    integrityScore: 95
  }
});
```

### Python SDK

```python
from chaintrace import ChainTraceClient

client = ChainTraceClient(
    api_key='your-api-key',
    base_url='https://api.chaintrace.io/v1'
)

# Get products
products = client.products.get_all(
    category='electronics',
    limit=20
)

# Create a new batch
batch = client.batches.create({
    'product_id': 1,
    'batch_number': 'BATCH003',
    'quantity': 1000,
    'raw_materials_hash': '0x1234...'
})

# Generate zero-knowledge proof
proof = client.zk_proofs.generate({
    'circuit_type': 'supply_chain_integrity',
    'inputs': {
        'productHash': '0x1234...',
        'batchId': 'BATCH003',
        'integrityScore': 95
    }
})
```

## Support

For API support and questions:

- **Documentation**: https://docs.chaintrace.io
- **Support Email**: api-support@chaintrace.io
- **GitHub Issues**: https://github.com/geraldinabeutnagel/ChainTrace/issues
- **Discord Community**: https://discord.gg/chaintrace

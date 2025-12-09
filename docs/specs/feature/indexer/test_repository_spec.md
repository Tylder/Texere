# Texere Indexer – Test Repository Specification

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Specification  
**Purpose:** Define comprehensive TypeScript test repository for indexer development and validation

---

## Table of Contents

1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Node Coverage Matrix](#node-coverage-matrix)
4. [Edge Coverage Matrix](#edge-coverage-matrix)
5. [File-by-File Breakdown](#file-by-file-breakdown)
6. [Git History & Incremental Testing](#git-history--incremental-testing)
7. [Edge Cases & Scenarios](#edge-cases--scenarios)
8. [Validation Checklist](#validation-checklist)
9. [Implementation Guide](#implementation-guide)

---

## Overview

### Purpose

The **test-typescript-app** is a realistic, medium-scale TypeScript application designed to:

- Exercise **all 14 node types** (with v1 mandatory focus)
- Exercise **all 10 relationship types** with property-based sub-typing
- Test **incremental indexing** via realistic git history
- Provide **regression detection** via golden snapshots
- Serve as **stable codebase** for implementation-driven development of the indexer

### Scope

- **Language**: TypeScript (single-language for v1 indexer focus)
- **Framework**: Express.js (realistic API patterns)
- **Database**: Prisma schema (DataContract patterns)
- **Testing**: Vitest/Jest style tests (TestCase detection)
- **Documentation**: Markdown specs (SpecDoc nodes)
- **Scale**: ~25 files, ~300+ symbols, intentionally compact but comprehensive

### Out of Scope (v2+)

- Python code (separate test repo)
- Microservices patterns (single app)
- Advanced patterns (streaming, WebSockets, etc.)

---

## Repository Structure

```
test-typescript-app/
├── .git/                          # Real git with 5 commits
├── package.json
├── tsconfig.json
├── src/
│   ├── config/
│   │   └── env.config.ts          # DataContract: config parsing
│   ├── models/
│   │   ├── user.ts                # Symbols: interface, type, enum
│   │   ├── post.ts                # Symbols: class with methods
│   │   └── schemas.ts             # Symbols: type definitions
│   ├── services/
│   │   ├── user.service.ts        # Symbols: service class, methods, calls
│   │   ├── auth.service.ts        # Symbols: service with circular dependency
│   │   ├── post.service.ts        # Symbols: service with data mutations
│   │   └── external-api.ts        # DEPENDS_ON external services
│   ├── api/
│   │   ├── routes.ts              # Boundaries: HTTP GET/POST/DELETE endpoints
│   │   ├── middleware.ts          # Symbols: middleware functions
│   │   └── handlers.ts            # Symbols: endpoint handlers
│   ├── utils/
│   │   ├── validators.ts          # Symbols: validator functions
│   │   ├── helpers.ts             # Symbols: circular import (edge case)
│   │   └── logger.ts              # Symbols: logger utility
│   ├── errors/
│   │   └── custom.errors.ts       # Symbols: error classes (inheritance)
│   ├── constants/
│   │   └── index.ts               # Symbols: const exports
│   └── index.ts                   # Module entry point, re-exports
├── tests/
│   ├── unit/
│   │   ├── services.test.ts       # TestCases: unit tests for services
│   │   ├── validators.test.ts     # TestCases: validator tests (edge cases)
│   │   └── errors.test.ts         # TestCases: error handling tests
│   └── integration/
│       ├── api.integration.test.ts # TestCases: API integration tests
│       └── data-flow.test.ts      # TestCases: data mutation tests
├── docs/
│   ├── README.md                  # SpecDoc: module overview
│   ├── API.md                     # SpecDoc: API documentation
│   ├── PATTERNS.md                # SpecDoc: pattern documentation
│   └── ARCHITECTURE.md            # SpecDoc: architecture guide
├── prisma/
│   ├── schema.prisma              # DataContract: Prisma schema
│   └── migrations/
│       └── init.sql               # DataContract: SQL schema
├── .env.example                   # Configuration: environment template
└── jest.config.js                 # Configuration: test runner config
```

---

## Node Coverage Matrix

### Snapshot-Scoped Nodes (v1 Mandatory)

| Node Type        | Count | Primary Location          | Secondary Locations     | Coverage Method                               |
| ---------------- | ----- | ------------------------- | ----------------------- | --------------------------------------------- |
| **Codebase**     | 1     | Repository root           | —                       | Root identifier                               |
| **Snapshot**     | 5     | Via git commits           | —                       | 5 commits (init, feat1, feat2, refactor, fix) |
| **Module**       | 3     | `src/`, `tests/`, `docs/` | `prisma/`, `config/`    | Directory hierarchy                           |
| **File**         | 25+   | All `.ts` and `.md` files | —                       | Every source file                             |
| **Symbol**       | 300+  | Throughout codebase       | —                       | Functions, classes, types, consts             |
| **Boundary**     | 3     | `src/api/routes.ts`       | `src/api/middleware.ts` | Express routes: GET/POST/DELETE               |
| **DataContract** | 5+    | `prisma/schema.prisma`    | `src/models/schemas.ts` | Prisma models, SQL schema                     |
| **TestCase**     | 8+    | `tests/**/*.test.ts`      | —                       | describe/it blocks                            |
| **SpecDoc**      | 4     | `docs/**/*.md`            | —                       | Markdown documentation files                  |

### Symbol Breakdown

| Category     | Count | Files                                                                 |
| ------------ | ----- | --------------------------------------------------------------------- |
| Functions    | ~50   | validators.ts, helpers.ts, logger.ts                                  |
| Classes      | ~12   | user.service.ts, auth.service.ts, post.service.ts, Post, User, errors |
| Methods      | ~40   | service methods, middleware functions                                 |
| Interfaces   | ~8    | user.ts (IUser), schemas.ts                                           |
| Type Aliases | ~10   | user.ts (UserRole), schemas.ts                                        |
| Enums        | ~3    | user.ts (UserStatus), custom types                                    |
| Constants    | ~15   | constants/index.ts, various config                                    |

---

## Edge Coverage Matrix

### Structural Edges (CONTAINS, IN_SNAPSHOT, LOCATION)

| Edge Type       | Sub-Type   | Source           | Target   | Count | Test Location                             |
| --------------- | ---------- | ---------------- | -------- | ----- | ----------------------------------------- |
| **CONTAINS**    | —          | Module           | File     | 25+   | Directory hierarchy                       |
| **CONTAINS**    | —          | File             | Symbol   | 300+  | All symbol definitions                    |
| **CONTAINS**    | —          | Module           | Module   | 3     | src/ ⊃ services/, models/, api/, etc.     |
| **IN_SNAPSHOT** | —          | All scoped nodes | Snapshot | 350+  | Every extracted node (critical invariant) |
| **LOCATION**    | IN_FILE    | Boundary         | File     | 3     | api/routes.ts                             |
| **LOCATION**    | IN_MODULE  | TestCase         | Module   | 3     | tests/ module                             |
| **LOCATION**    | HANDLED_BY | Boundary         | Symbol   | 3     | Route handler functions                   |

### Code Relations (REFERENCES)

| Sub-Type     | Source | Target        | Count | Examples                                             |
| ------------ | ------ | ------------- | ----- | ---------------------------------------------------- |
| **CALL**     | Symbol | Symbol        | 40+   | userService.createUser(), validators.validateEmail() |
| **TYPE_REF** | Symbol | Symbol        | 35+   | `IUser` interface references, `UserRole` type usage  |
| **IMPORT**   | File   | Symbol/Module | 30+   | `import { UserService }`, `import * as helpers`      |
| **PATTERN**  | Symbol | Pattern       | 2     | Service pattern usage (DEPENDS_ON style pattern)     |
| **SIMILAR**  | Symbol | Symbol        | N/A   | Embedding-based (future: vector search)              |

**Coverage by file**:

- `src/services/user.service.ts`: 5+ CALL edges, 3+ TYPE_REF edges
- `src/api/routes.ts`: 4+ CALL edges (to services)
- `src/utils/helpers.ts` ↔ `src/services/auth.service.ts`: 1 circular IMPORT

### Implementation (REALIZES)

| Sub-Type       | Source   | Target   | Count | Examples                                  |
| -------------- | -------- | -------- | ----- | ----------------------------------------- |
| **IMPLEMENTS** | Symbol   | Feature  | 0\*   | \*LLM-assisted in v2; reserved for future |
| **TESTS**      | TestCase | Symbol   | 8+    | test file tests user.service.ts           |
| **VERIFIES**   | TestCase | Boundary | 2+    | integration test verifies API endpoints   |

### Data Flow (MUTATES)

| Operation | Source | Target       | Count | Examples                                   |
| --------- | ------ | ------------ | ----- | ------------------------------------------ |
| **READ**  | Symbol | DataContract | 3+    | UserService.getUser() reads User model     |
| **WRITE** | Symbol | DataContract | 2+    | UserService.createUser() writes User model |

**Coverage**:

- `src/services/user.service.ts`: READ/WRITE User entity
- `src/services/post.service.ts`: READ/WRITE Post entity

### Dependencies (DEPENDS_ON)

| Sub-Type        | Source | Target          | Count | Examples                     |
| --------------- | ------ | --------------- | ----- | ---------------------------- |
| **LIBRARY**     | Module | ExternalService | 2     | axios (external HTTP client) |
| **SERVICE**     | Symbol | ExternalService | 2     | Stripe, Auth0 API calls      |
| **CONFIG**      | Symbol | Configuration   | 3     | env.config.ts references     |
| **STYLE_GUIDE** | Module | StyleGuide      | 0\*   | \*Reserved for future        |

### Documentation (DOCUMENTS)

| Sub-Type     | Source  | Target   | Count | Examples                                    |
| ------------ | ------- | -------- | ----- | ------------------------------------------- |
| **MODULE**   | SpecDoc | Module   | 1     | docs/README.md documents src/ module        |
| **ENDPOINT** | SpecDoc | Boundary | 2     | docs/API.md documents endpoints             |
| **SYMBOL**   | SpecDoc | Symbol   | 3     | docs/PATTERNS.md references Service pattern |
| **PATTERN**  | SpecDoc | Pattern  | 1     | docs/PATTERNS.md documents Service pattern  |

### Evolution (TRACKS)

| Event          | Source | Target   | Count | Examples                                             |
| -------------- | ------ | -------- | ----- | ---------------------------------------------------- |
| **INTRODUCED** | Symbol | Snapshot | 20+   | Symbols introduced in commit 2 (feat: user-service)  |
| **MODIFIED**   | Symbol | Snapshot | 5+    | Symbols modified in commit 5 (fix: email-validation) |

**Coverage by commit**:

- Commit 1 (init): All node/module infrastructure
- Commit 2 (feat: user-service): Introduce UserService, models, tests
- Commit 3 (feat: api-routes): Introduce Boundary nodes
- Commit 4 (refactor: rename-service): MODIFIED tracking (UserService → UserRepository)
- Commit 5 (fix: email-validation): MODIFIED tracking (validators.validateEmail)

---

## File-by-File Breakdown

### `src/models/user.ts` (Symbols: Interface, Type, Enum)

**Nodes extracted**:

- Symbol: `IUser` (interface)
- Symbol: `UserRole` (type alias)
- Symbol: `UserStatus` (enum)

**Edges**:

- LOCATION {role: 'IN_FILE'} → File
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export type UserRole = 'admin' | 'user' | 'guest';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}
```

**Tests**:

- Verifies interface extraction
- Verifies type alias extraction
- Verifies enum extraction
- Validates symbol IDs (stable per snapshot)

---

### `src/models/post.ts` (Class with Methods)

**Nodes extracted**:

- Symbol: `Post` (class)
- Symbol: `constructor` (method)
- Symbol: `getTitle` (method)
- Symbol: `updateTitle` (method)
- Symbol: `getAuthor` (method)

**Edges**:

- REFERENCES {type: 'TYPE_REF'} → IUser (author property type)
- MUTATES {operation: 'WRITE'} → Post entity (updateTitle)
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import { IUser } from './user';

export class Post {
  constructor(
    private id: string,
    private title: string,
    private author: IUser,
  ) {}

  getTitle(): string {
    return this.title;
  }

  updateTitle(newTitle: string): void {
    this.title = newTitle; // MUTATES
  }

  getAuthor(): IUser {
    return this.author; // TYPE_REF to IUser
  }
}
```

**Tests**:

- Verifies class extraction
- Verifies method extraction
- Verifies TYPE_REF edges (interface references)
- Verifies MUTATES edges (write operations)

---

### `src/services/user.service.ts` (Service with Calls & Imports)

**Nodes extracted**:

- Symbol: `UserService` (class)
- Symbol: `constructor` (method)
- Symbol: `createUser` (method)
- Symbol: `getUser` (method)

**Edges**:

- REFERENCES {type: 'IMPORT'} → AuthService
- REFERENCES {type: 'IMPORT'} → validators
- REFERENCES {type: 'CALL'} → AuthService.generateToken
- REFERENCES {type: 'CALL'} → validators.validateEmail
- MUTATES {operation: 'READ'} → User entity
- MUTATES {operation: 'WRITE'} → User entity
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import { IUser } from '../models/user';
import { AuthService } from './auth.service';
import { validators } from '../utils/validators';

export class UserService {
  constructor(private authService: AuthService) {}

  async createUser(email: string): Promise<IUser> {
    validators.validateEmail(email); // CALL
    const token = this.authService.generateToken(email); // CALL
    // CREATE in database (MUTATES WRITE)
    return { id: '1', email, name: '', role: 'user', status: 'active' };
  }

  async getUser(id: string): Promise<IUser> {
    // READ from database (MUTATES READ)
    return { id, email: 'test@test.com', name: 'Test', role: 'user', status: 'active' };
  }
}
```

**Tests**:

- Verifies IMPORT edge extraction
- Verifies CALL edge extraction (method invocation)
- Verifies dependency chain (UserService → AuthService)
- Verifies MUTATES edges (READ/WRITE data access)

---

### `src/services/auth.service.ts` (Circular Import Edge Case)

**Nodes extracted**:

- Symbol: `AuthService` (class)
- Symbol: `generateToken` (method)
- Symbol: `verifyToken` (method)

**Edges**:

- REFERENCES {type: 'IMPORT'} → helpers (circular: helpers also imports auth)
- REFERENCES {type: 'CALL'} → helpers.sanitizeEmail
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import { helpers } from '../utils/helpers';

export class AuthService {
  generateToken(email: string): string {
    const sanitized = helpers.sanitizeEmail(email); // CALL
    return 'token_' + sanitized;
  }

  verifyToken(token: string): boolean {
    return token.startsWith('token_');
  }
}
```

**Edge Case**:

- `auth.service.ts` imports `helpers`
- `helpers.ts` imports `auth.service` (circular)
- Indexer must detect and skip without crashing

**Tests**:

- Verifies circular import handling (no infinite loops)
- Verifies call graph still extracts correctly despite cycle

---

### `src/api/routes.ts` (HTTP Boundaries)

**Nodes extracted**:

- Boundary: `GET /users/:id` with handler function
- Boundary: `POST /users` with handler function
- Boundary: `DELETE /users/:id` with handler function
- Symbol: route handler functions

**Edges**:

- LOCATION {role: 'HANDLED_BY'} → handler function symbol
- REFERENCES {type: 'CALL'} → UserService.getUser
- REFERENCES {type: 'CALL'} → UserService.createUser
- REFERENCES {type: 'IMPORT'} → UserService
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import express from 'express';
import { UserService } from '../services/user.service';
import { authMiddleware } from './middleware';

const router = express.Router();
const userService = new UserService();

// Boundary: GET /users/:id
router.get('/users/:id', authMiddleware, async (req, res) => {
  const user = await userService.getUser(req.params.id);
  res.json(user);
});

// Boundary: POST /users
router.post('/users', async (req, res) => {
  const user = await userService.createUser(req.body.email);
  res.status(201).json(user);
});

// Boundary: DELETE /users/:id
router.delete('/users/:id', authMiddleware, (req, res) => {
  res.status(204).send();
});

export default router;
```

**Tests**:

- Verifies Boundary node extraction (HTTP endpoints)
- Verifies LOCATION edges (handler mapping)
- Verifies CALL edges to services
- Verifies middleware detection

---

### `src/utils/validators.ts` (Utility Functions)

**Nodes extracted**:

- Symbol: `validateEmail` (function)
- Symbol: `validatePassword` (function)
- Symbol: `validatePhone` (function)
- Symbol: `validators` (object/const)

**Edges**:

- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
export const validators = {
  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  validatePassword(pwd: string): boolean {
    return pwd.length >= 8;
  },

  validatePhone(phone: string): boolean {
    return /^\d{10}$/.test(phone);
  },
};
```

**Tests**:

- Verifies utility function extraction
- Verifies nested function properties (validators.validateEmail)
- Validates regex patterns don't break parser

---

### `src/utils/helpers.ts` (Circular Import)

**Nodes extracted**:

- Symbol: `sanitizeEmail` (function)
- Symbol: `verifyWithAuth` (function)
- Symbol: `helpers` (object/const)

**Edges**:

- REFERENCES {type: 'IMPORT'} → AuthService (circular)
- REFERENCES {type: 'CALL'} → AuthService.verifyToken

**Code**:

```typescript
import { AuthService } from '../services/auth.service'; // CIRCULAR!

export const helpers = {
  sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  },

  async verifyWithAuth(token: string): Promise<boolean> {
    const auth = new AuthService();
    return auth.verifyToken(token);
  },
};
```

**Tests**:

- Verifies circular import is detected (helps debug graphing)
- Verifies extraction still works despite cycle

---

### `src/errors/custom.errors.ts` (Error Classes)

**Nodes extracted**:

- Symbol: `ValidationError` (class)
- Symbol: `AuthenticationError` (class)
- Symbol: `NotFoundError` (class)

**Edges**:

- REFERENCES {type: 'TYPE_REF'} → Error (extends)
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

**Tests**:

- Verifies error class extraction
- Verifies inheritance detection (extends Error)

---

### `src/constants/index.ts` (Constants & Enums)

**Nodes extracted**:

- Symbol: `API_VERSION` (const)
- Symbol: `MAX_USERS_PER_PAGE` (const)
- Symbol: `TOKEN_EXPIRY_MINUTES` (const)
- Symbol: `DEFAULT_CONFIG` (const)

**Edges**:

- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
export const API_VERSION = '1.0.0';
export const MAX_USERS_PER_PAGE = 50;
export const TOKEN_EXPIRY_MINUTES = 30;

export const DEFAULT_CONFIG = {
  port: 3000,
  env: 'development',
  db: 'postgres://localhost:5432/test',
};
```

**Tests**:

- Verifies const extraction
- Verifies exported consts
- Validates complex object constants

---

### `tests/unit/services.test.ts` (Unit Tests)

**Nodes extracted**:

- TestCase: describe 'UserService'
- TestCase: it 'should create a user'
- TestCase: it 'should throw on invalid email'
- TestCase: it 'should get user by id'

**Edges**:

- REALIZES {role: 'TESTS'} → UserService
- LOCATION {role: 'IN_FILE'} → File
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import { describe, it, expect } from 'vitest';
import { UserService } from '../../src/services/user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('should create a user', async () => {
    const user = await service.createUser('test@test.com');
    expect(user.email).toBe('test@test.com');
  });

  it('should throw on invalid email', async () => {
    expect(() => service.createUser('invalid')).toThrow();
  });

  it('should get user by id', async () => {
    const user = await service.getUser('1');
    expect(user.id).toBe('1');
  });
});
```

**Tests**:

- Verifies TestCase node extraction
- Verifies REALIZES {role: 'TESTS'} edges
- Verifies test name detection (describe + it blocks)
- Validates async test handling

---

### `tests/integration/api.integration.test.ts` (Integration Tests)

**Nodes extracted**:

- TestCase: describe 'API Integration'
- TestCase: it 'should create and retrieve user via API'
- TestCase: it 'should fail auth without token'

**Edges**:

- REALIZES {role: 'VERIFIES'} → Boundary (HTTP endpoints)
- LOCATION {role: 'IN_FILE'} → File
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('API Integration', () => {
  it('should create and retrieve user via API', async () => {
    const res = await request(app).post('/users').send({ email: 'test@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@test.com');
  });

  it('should fail auth without token', async () => {
    const res = await request(app).get('/users/1');
    expect(res.status).toBe(401);
  });
});
```

**Tests**:

- Verifies integration test detection
- Verifies VERIFIES edges (tests verify boundaries)
- Validates multi-line test structure

---

### `docs/README.md` (SpecDoc: Module Overview)

**Nodes extracted**:

- SpecDoc: 'User Service Module'

**Edges**:

- DOCUMENTS {type: 'MODULE'} → src/ module
- IN_SNAPSHOT → Snapshot

**Content**:

```markdown
# User Service Module

## Overview

Handles user creation, retrieval, and authentication.

## Architecture

- UserService: Core business logic
- AuthService: Token generation and verification
- Models: Data types for User and Post

## Related Endpoints

- GET /users/:id
- POST /users
- DELETE /users/:id

## Related Services

- UserService
- AuthService
```

**Tests**:

- Verifies SpecDoc extraction from Markdown
- Verifies DOCUMENTS edges to modules

---

### `docs/API.md` (SpecDoc: API Documentation)

**Nodes extracted**:

- SpecDoc: 'API Documentation'

**Edges**:

- DOCUMENTS {type: 'ENDPOINT'} → Boundary nodes (endpoints)
- IN_SNAPSHOT → Snapshot

**Tests**:

- Verifies SpecDoc linking to endpoints
- Validates endpoint documentation correlation

---

### `docs/PATTERNS.md` (SpecDoc: Pattern Documentation)

**Nodes extracted**:

- SpecDoc: 'Code Patterns'

**Edges**:

- DOCUMENTS {type: 'PATTERN'} → Pattern nodes (future)
- IN_SNAPSHOT → Snapshot

**Tests**:

- Verifies pattern documentation extraction
- Validates future pattern node linking

---

### `prisma/schema.prisma` (DataContract: Prisma Schema)

**Nodes extracted**:

- DataContract: `User` (model)
- DataContract: `Post` (model)
- DataContract: `UserRole` (enum)

**Edges**:

- LOCATION {role: 'IN_FILE'} → File
- IN_SNAPSHOT → Snapshot

**Code**:

```prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String
  role  UserRole @default(USER)
  posts Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id    String @id @default(cuid())
  title String
  body  String
  authorId String
  author User @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  ADMIN
  USER
  GUEST
}
```

**Tests**:

- Verifies Prisma schema extraction (v1: basic parsing)
- Verifies DataContract nodes
- Note: v1 does not deeply parse Prisma type relationships; that's v2

---

### `src/config/env.config.ts` (Configuration)

**Nodes extracted**:

- Symbol: `loadConfig` (function)
- Symbol: `config` (object)

**Edges**:

- DEPENDS_ON {kind: 'CONFIG'} → Configuration
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  db: process.env.DATABASE_URL || 'postgres://localhost:5432/test',
  secretKey: process.env.SECRET_KEY,
  externalApiUrl: process.env.EXTERNAL_API_URL,
};
```

**Tests**:

- Verifies configuration symbol extraction
- Verifies DEPENDS_ON edges for env variables

---

### `src/services/external-api.ts` (External Dependencies)

**Nodes extracted**:

- Symbol: `ExternalAPIService` (class)
- Symbol: `callStripeAPI` (method)
- Symbol: `callAuthProvider` (method)

**Edges**:

- DEPENDS_ON {kind: 'SERVICE'} → ExternalService (Stripe)
- DEPENDS_ON {kind: 'SERVICE'} → ExternalService (Auth0)
- REFERENCES {type: 'IMPORT'} → axios
- DEPENDS_ON {kind: 'LIBRARY'} → axios
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import axios from 'axios';

export class ExternalAPIService {
  async callStripeAPI(customerId: string) {
    // DEPENDS_ON: external service
    const response = await axios.get(`https://api.stripe.com/customers/${customerId}`);
    return response.data;
  }

  async callAuthProvider(userId: string) {
    // DEPENDS_ON: external service
    const response = await axios.get(`https://auth0.com/api/users/${userId}`);
    return response.data;
  }
}
```

**Tests**:

- Verifies DEPENDS_ON edges for external services
- Verifies library dependency extraction

---

## Git History & Incremental Testing

### Commit Strategy

The test repository includes **5 commits** to validate incremental indexing (Git diff detection):

#### **Commit 1: `init` (Initial Setup)**

- Files added: `package.json`, `tsconfig.json`, `jest.config.js`, `.env.example`
- Snapshot 1 baseline

**Indexing behavior**: All files indexed fresh.

---

#### **Commit 2: `feat: user-service` (User & Auth Services)**

- Files added: `src/models/user.ts`, `src/models/post.ts`, `src/services/user.service.ts`,
  `src/services/auth.service.ts`, `tests/unit/services.test.ts`
- New symbols introduced: UserService, AuthService, IUser, UserRole, UserStatus, Post

**Indexing behavior**:

- Git diff reports added files
- Only these files indexed
- TRACKS {event: 'INTRODUCED'} → Snapshot 2 for all new symbols
- TestCases linked via REALIZES

---

#### **Commit 3: `feat: api-routes` (HTTP Boundaries)**

- Files added: `src/api/routes.ts`, `src/api/middleware.ts`,
  `tests/integration/api.integration.test.ts`
- New nodes: 3 Boundary nodes (GET, POST, DELETE endpoints)
- New TestCases: integration tests

**Indexing behavior**:

- Git diff reports 3 added files
- Boundary detection triggered
- REALIZES {role: 'VERIFIES'} edges created for integration tests

---

#### **Commit 4: `refactor: rename-service` (Rename Detection)**

- Files modified: `src/services/user.service.ts` → content refactored, class rename (UserService →
  UserRepository)
- This tests v1 **rename = delete + add** rule

**Indexing behavior**:

- Git diff reports modified file
- Old symbol (UserService) would be deleted in v1 (renames not tracked)
- New symbol (UserRepository) created as fresh symbol
- TRACKS {event: 'MODIFIED'} on file, but renames don't create continuity

---

#### **Commit 5: `fix: email-validation` (Modify Existing Symbol)**

- Files modified: `src/utils/validators.ts` (validateEmail regex updated)
- Existing symbol modified

**Indexing behavior**:

- Git diff reports modified file
- Symbol ID unchanged (same name, location, range)
- Symbol updated in place
- TRACKS {event: 'MODIFIED'} → Snapshot 5

---

### Incremental Testing Workflow

```typescript
// Pseudo-test outline
describe('Incremental Indexing via Git History', () => {
  it('Snapshot 1 (init): Base structure', async () => {
    // Index commit 1
    // Assert: Codebase, Snapshot, Module nodes created
    // Assert: File, Symbol counts match expected
  });

  it('Snapshot 2 (feat: user-service): New symbols introduced', async () => {
    // Index commit 2
    // Assert: New symbols have TRACKS {event: 'INTRODUCED'} → Snapshot 2
    // Assert: TestCases created and linked
    // Assert: Call graph between services extracted
  });

  it('Snapshot 3 (feat: api-routes): Boundaries extracted', async () => {
    // Index commit 3
    // Assert: 3 Boundary nodes created
    // Assert: LOCATION edges to handlers
    // Assert: Integration tests linked via VERIFIES
  });

  it('Snapshot 4 (refactor): Renames = delete + add', async () => {
    // Index commit 4 (rename UserService → UserRepository)
    // Assert: Old symbol is marked deleted/removed
    // Assert: New symbol has INTRODUCED marker
    // Assert: Imports referencing old name need graph adjustment (v1 limitation)
  });

  it('Snapshot 5 (fix): Modified symbol tracking', async () => {
    // Index commit 5 (validateEmail modified)
    // Assert: Symbol ID stable (same name, location)
    // Assert: Symbol has TRACKS {event: 'MODIFIED'} → Snapshot 5
    // Assert: Previous snapshots still have old version
  });

  it('Snapshot diff (2→3): Only changed files indexed', async () => {
    // Index incrementally from Snapshot 2 → Snapshot 3
    // Assert: Only api/ and tests/integration/ files processed
    // Assert: Snapshot 2 symbols unchanged (reused)
    // Assert: Git diff correctly identifies deltas
  });
});
```

---

## Edge Cases & Scenarios

### Edge Case 1: Circular Imports

**Files**: `src/services/auth.service.ts` ↔ `src/utils/helpers.ts`

**Behavior**:

- auth.service imports helpers
- helpers imports auth.service
- Expected: Indexer processes both, detects cycle, no infinite loop
- Call graph still extracts (both directions)

**Test**:

```typescript
it('handles circular imports without infinite loop', async () => {
  const result = await indexFiles(['auth.service.ts', 'helpers.ts']);
  expect(result.calls).toContain({
    callerSymbolId: 'authService:generateToken',
    calleeSymbolId: 'helpers:sanitizeEmail',
  });
  // No stack overflow or hang
});
```

---

### Edge Case 2: Rename = Delete + Add

**Commit 4**: UserService → UserRepository

**Behavior**:

- v1 treats renames as delete (old) + add (new)
- No continuity tracking
- Dependent imports (routes.ts) must be reindexed to update references

**Test**:

```typescript
it('treats renames as delete + add (v1 limitation)', async () => {
  const snap4 = await indexSnapshot(commit4);
  // Old symbol (UserService) is gone
  expect(snap4.symbols).not.toContain(id('UserService'));
  // New symbol (UserRepository) exists
  expect(snap4.symbols).toContain(id('UserRepository'));
  // Routes file now has broken reference (test validates graceful handling)
});
```

---

### Edge Case 3: Async Methods & Promises

**Files**: `src/services/user.service.ts` (createUser, getUser are async)

**Behavior**:

- Async method signatures parsed correctly
- Promise<T> type references detected
- Return type inference works

**Test**:

```typescript
it('extracts async method signatures', async () => {
  const createUser = result.symbols.find((s) => s.name === 'createUser');
  expect(createUser.kind).toBe('method');
  // Type parameter IUser should be referenced
  expect(result.references).toContain({
    fromSymbolId: createUser.id,
    toSymbolId: 'IUser',
    type: 'TYPE_REF',
  });
});
```

---

### Edge Case 4: Type Narrowing & Unions

**File**: `src/models/user.ts` (UserRole = 'admin' | 'user' | 'guest')

**Behavior**:

- Union type detected as type alias
- Literal types recognized
- Export statement parsed

**Test**:

```typescript
it('extracts union types and type aliases', async () => {
  const userRole = result.symbols.find((s) => s.name === 'UserRole');
  expect(userRole.kind).toBe('type');
});
```

---

### Edge Case 5: Nested Objects & Validators

**File**: `src/utils/validators.ts` (validators.validateEmail structure)

**Behavior**:

- Object with nested functions detected
- Each function is a symbol
- Const export captured

**Test**:

```typescript
it('extracts nested function properties', async () => {
  const validateEmail = result.symbols.find((s) => s.name === 'validateEmail');
  const validatePassword = result.symbols.find((s) => s.name === 'validatePassword');
  expect([validateEmail, validatePassword]).toHaveLength(2);
  // Both should have parent reference to validators object
});
```

---

### Edge Case 6: Prisma Schema Parsing

**File**: `prisma/schema.prisma`

**Behavior**:

- Prisma models detected as DataContract nodes
- Field types recognized (basic: string, int, boolean, DateTime)
- Relations detected (User ↔ Post)
- Enums extracted (UserRole)

**Note**: v1 does shallow parsing; v2 adds deeper type resolution.

**Test**:

```typescript
it('extracts Prisma schema models as DataContract nodes', async () => {
  const user = result.dataContracts.find((d) => d.name === 'User');
  const post = result.dataContracts.find((d) => d.name === 'Post');
  expect([user, post]).toHaveLength(2);
  // Relations not deeply tracked in v1; just model detection
});
```

---

### Edge Case 7: Error Handling & Try-Catch

**File**: `src/services/user.service.ts` (error handling in createUser)

**Behavior**:

- Try-catch blocks detected
- Throw statements identified
- Error references captured

**Test**:

```typescript
it('detects error throwing and handling', async () => {
  const createUser = result.symbols.find((s) => s.name === 'createUser');
  // ValidationError is thrown (detected via AST)
  // In v2, THROWS edges would be created
});
```

---

### Edge Case 8: Re-exports

**File**: `src/index.ts` (module re-exports)

**Code**:

```typescript
export { UserService } from './services/user.service';
export { AuthService } from './services/auth.service';
export * from './models/user';
export type { IUser } from './models/user';
```

**Behavior**:

- Re-exports detected as IMPORT + re-export
- Barrel file pattern recognized

**Test**:

```typescript
it('detects re-exports as import + public interface', async () => {
  // src/index.ts should have REFERENCES {type: 'IMPORT'} to UserService
  // UserService should be marked as re-exported
});
```

---

## Validation Checklist

Use this checklist to validate the indexer against the test repository:

### Node Extraction

- [ ] **Symbols**: Extract function, class, method, const, type, interface, enum from all files
- [ ] **Boundaries**: Detect 3 HTTP endpoints (GET/POST/DELETE) from Express routes
- [ ] **TestCases**: Extract 8+ test cases from describe/it blocks
- [ ] **DataContracts**: Parse Prisma schema (User, Post, UserRole) and basic SQL schema
- [ ] **SpecDocs**: Extract 4 markdown documentation files
- [ ] **Cardinality**: Every symbol has exactly 1 `[:IN_SNAPSHOT]` edge
- [ ] **Symbol IDs**: Stable within snapshot (path + name + range)

### Edge Extraction

- [ ] **CONTAINS**: Module → File, File → Symbol hierarchy (25+ edges)
- [ ] **IN_SNAPSHOT**: Every node links to its snapshot (350+ edges)
- [ ] **LOCATION**: Boundaries → handlers, TestCases → files (5+ edges)
- [ ] **REFERENCES {type: 'CALL'}**: Service method calls, utility function calls (40+ edges)
- [ ] **REFERENCES {type: 'TYPE_REF'}**: Interface usage, type annotations (35+ edges)
- [ ] **REFERENCES {type: 'IMPORT'}**: Import statements (30+ edges, includes circular)
- [ ] **MUTATES {operation: 'READ'}**: Data read operations (3+ edges)
- [ ] **MUTATES {operation: 'WRITE'}**: Data write operations (2+ edges)
- [ ] **DEPENDS_ON {kind: 'SERVICE'}**: External API calls (Stripe, Auth0) (2 edges)
- [ ] **DEPENDS_ON {kind: 'LIBRARY'}**: Third-party libraries (axios) (1+ edges)
- [ ] **REALIZES {role: 'TESTS'}**: TestCase → Symbol (8+ edges)
- [ ] **REALIZES {role: 'VERIFIES'}**: TestCase → Boundary (2+ edges)
- [ ] **DOCUMENTS**: SpecDoc → Module, Boundary, Symbol (4+ edges)
- [ ] **TRACKS {event: 'INTRODUCED'}**: New symbols in Snapshot 2, 3 (20+ edges)
- [ ] **TRACKS {event: 'MODIFIED'}**: Modified symbols in Snapshot 5 (5+ edges)

### Git Incremental Behavior

- [ ] **Snapshot 1**: All files indexed
- [ ] **Snapshot 2**: Only new files indexed; TRACKS INTRODUCED for new symbols
- [ ] **Snapshot 3**: Only api/ files indexed; TRACKS INTRODUCED for Boundary nodes
- [ ] **Snapshot 4**: Rename detected as delete + add (old symbol gone, new symbol fresh)
- [ ] **Snapshot 5**: Modified file re-indexed; symbol updated; TRACKS MODIFIED created

### Edge Cases

- [ ] **Circular imports**: No infinite loop; both directions extracted
- [ ] **Async methods**: Parsed correctly with Promise<T> type refs
- [ ] **Union types**: Detected as type aliases
- [ ] **Nested objects**: validators.validateEmail extracted as symbol
- [ ] **Error classes**: Inheritance (extends Error) detected
- [ ] **Re-exports**: Barrel files recognized
- [ ] **Configuration**: env.config.ts DEPENDS_ON edges created
- [ ] **Prisma schema**: Basic model extraction (no deep type resolution in v1)

### Golden Snapshots (Regression Detection)

- [ ] **FileIndexResult golden**: Store expected output for each test file
  - user.ts → symbols: 3 (IUser, UserRole, UserStatus)
  - user.service.ts → symbols: 4 (UserService + 3 methods), edges: 8 (imports, calls, mutates)
  - routes.ts → boundaries: 3, symbols: 3 (handlers), edges: 10+
- [ ] **Diff detection**: Store expected Git diffs for each commit
- [ ] **Snapshot comparison**: Validate Snapshot 5 against Snapshot 1 (structure stability)

---

## Implementation Guide

### Setting Up the Test Repository

1. **Create directory**:

   ```bash
   mkdir -p test-fixtures/typescript-app
   cd test-fixtures/typescript-app
   ```

2. **Initialize git**:

   ```bash
   git init
   git config user.email "test@example.com"
   git config user.name "Test User"
   ```

3. **Create files for Commit 1** (init): package.json, tsconfig.json, etc.

4. **Commit 1**:

   ```bash
   git add .
   git commit -m "init"
   ```

5. **Add files for Commit 2** (feat: user-service): models, services, tests

6. **Commit 2**:

   ```bash
   git add .
   git commit -m "feat: user-service"
   ```

7. **Repeat for commits 3–5**

### Running Indexer Against Test Repo

```typescript
import { indexSnapshot } from '@repo/indexer/ingest';

const testRepoPath = '/path/to/test-fixtures/typescript-app';
const codebaseId = 'test-typescript-app';
const commit1Hash = 'abc123'; // Actual commit hash

const result = await indexSnapshot({
  codebaseId,
  codebaseRoot: testRepoPath,
  commitHash: commit1Hash,
});

// result contains FileIndexResult[]
console.log('Symbols extracted:', result.symbols.length);
console.log('Boundaries extracted:', result.boundaries.length);
console.log('TestCases extracted:', result.testCases.length);
```

### Integration with Test Suite

Place integration tests in: `packages/indexer/ingest/__tests__/`

Example test structure:

```typescript
describe('TypeScript Indexer (test-typescript-app)', () => {
  const testRepoPath = 'test-fixtures/typescript-app';

  describe('Node Extraction', () => {
    it('extracts symbols from user.service.ts', async () => {
      // Test UserService class extraction
    });

    it('extracts 3 boundaries from routes.ts', async () => {
      // Test Boundary node extraction
    });

    it('extracts 8+ TestCases from test files', async () => {
      // Test TestCase extraction
    });
  });

  describe('Edge Extraction', () => {
    it('creates REFERENCES {type: CALL} for service method calls', async () => {
      // Test call graph
    });

    it('creates MUTATES edges for data access', async () => {
      // Test data flow
    });
  });

  describe('Incremental Indexing', () => {
    it('indexes only changed files between snapshots', async () => {
      // Test Git diff behavior
    });

    it('tracks INTRODUCED and MODIFIED events', async () => {
      // Test TRACKS edges
    });
  });

  describe('Edge Cases', () => {
    it('handles circular imports gracefully', async () => {
      // Test circular dependency handling
    });

    it('treats renames as delete + add (v1 limitation)', async () => {
      // Test rename detection
    });
  });
});
```

---

## References

- [ingest_spec.md](./ingest_spec.md) – Core indexing specification
- [graph_schema_spec.md](./graph_schema_spec.md) – Node/edge schema
- [nodes/README.md](./nodes/README.md) – Node type catalog
- [edges/README.md](./edges/README.md) – Edge type catalog
- [testing_strategy_spec.md](./testing_strategy_spec.md) – Testing strategy (TBD sections)

---

**End of Test Repository Specification**

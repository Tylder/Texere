# Texere Indexer – Test Repository Specification

**Document Version:** 1.1  
**Last Updated:** December 2025  
**Status:** Specification  
**Purpose:** Define comprehensive TypeScript test repository for indexer development and validation

**Changelog:**

- v1.1 (2025-12-09): Added Zod validation schemas for testing schema extraction and type inference
- v1.0 (2025-12-09): Initial specification with full node/edge coverage matrix

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
│   ├── validation/
│   │   └── schemas.ts             # Zod schemas: validation definitions, types
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

| Node Type        | Count | Primary Location          | Secondary Locations                                  | Coverage Method                               |
| ---------------- | ----- | ------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| **Codebase**     | 1     | Repository root           | —                                                    | Root identifier                               |
| **Snapshot**     | 5     | Via git commits           | —                                                    | 5 commits (init, feat1, feat2, refactor, fix) |
| **Module**       | 3     | `src/`, `tests/`, `docs/` | `prisma/`, `config/`                                 | Directory hierarchy                           |
| **File**         | 25+   | All `.ts` and `.md` files | —                                                    | Every source file                             |
| **Symbol**       | 300+  | Throughout codebase       | —                                                    | Functions, classes, types, consts             |
| **Boundary**     | 3     | `src/api/routes.ts`       | `src/api/middleware.ts`                              | Express routes: GET/POST/DELETE               |
| **DataContract** | 8+    | `prisma/schema.prisma`    | `src/models/schemas.ts`, `src/validation/schemas.ts` | Prisma models, Zod schemas                    |
| **TestCase**     | 8+    | `tests/**/*.test.ts`      | —                                                    | describe/it blocks                            |
| **SpecDoc**      | 4     | `docs/**/*.md`            | —                                                    | Markdown documentation files                  |

### Symbol Breakdown

| Category     | Count | Files                                                                 |
| ------------ | ----- | --------------------------------------------------------------------- |
| Functions    | ~50   | validators.ts, helpers.ts, logger.ts                                  |
| Classes      | ~12   | user.service.ts, auth.service.ts, post.service.ts, Post, User, errors |
| Methods      | ~40   | service methods, middleware functions                                 |
| Interfaces   | ~8    | user.ts (IUser), schemas.ts                                           |
| Type Aliases | ~15   | user.ts (UserRole), schemas.ts, validation/schemas.ts (z.infer)       |
| Enums        | ~3    | user.ts (UserStatus), custom types                                    |
| Constants    | ~20   | constants/index.ts, validation/schemas.ts (Zod schemas), config       |

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

| Sub-Type        | Source | Target          | Count | Examples                        |
| --------------- | ------ | --------------- | ----- | ------------------------------- |
| **LIBRARY**     | Module | ExternalService | 3     | axios, zod (validation library) |
| **SERVICE**     | Symbol | ExternalService | 2     | Stripe, Auth0 API calls         |
| **CONFIG**      | Symbol | Configuration   | 3     | env.config.ts references        |
| **STYLE_GUIDE** | Module | StyleGuide      | 0\*   | \*Reserved for future           |

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

- **Snapshot-1** (init + complete): All infrastructure, UserRepository, AuthService, PostService,
  API routes, full test suite (50 tests)
- **Snapshot-2** (feat: comment-service): Add CommentService with Comment model, integrate with
  PostService and UserRepository, create new CALL/MUTATES edges
- **Snapshot-3** (feat: public-posts-service): Add PublicPostListService (no auth required), new
  Boundary nodes for public endpoints, READ-only access patterns

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

### `src/validation/schemas.ts` (Zod Schemas)

**Nodes extracted**:

- Symbol: `userSchema` (Zod schema object)
- Symbol: `createUserSchema` (Zod schema object)
- Symbol: `loginSchema` (Zod schema object)
- Symbol: `postSchema` (Zod schema object)
- DataContract: Inferred from Zod schema types (User validation shape, Post validation shape)

**Edges**:

- REFERENCES {type: 'TYPE_REF'} → IUser (input type)
- REFERENCES {type: 'TYPE_REF'} → z.ZodSchema (Zod library)
- REFERENCES {type: 'IMPORT'} → zod
- DEPENDS_ON {kind: 'LIBRARY'} → zod
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import { z } from 'zod';
import { IUser, UserRole, UserStatus } from '../models/user';

// User validation schema
export const userSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'user', 'guest'] as const).default('user'),
  status: z.enum(['active', 'inactive', 'suspended'] as const).default('active'),
});

// Create user input validation
export const createUserSchema = userSchema.omit({ id: true, status: true });

// Login validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Post validation schema
export const postSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  authorId: z.string().cuid(),
});

export const createPostSchema = postSchema.omit({ id: true });

// Type inference from schemas (inferred DataContract)
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type Post = z.infer<typeof postSchema>;
```

**Tests**:

- Verifies Zod schema extraction (z.object, z.string, z.enum patterns)
- Verifies inferred type definitions (type aliases from z.infer)
- Verifies library dependency on zod
- Validates DataContract extraction from validation schemas
- Tests REFERENCES edges to Zod types and IUser interface

**Edge Cases Tested**:

- Zod method chaining: `.min()`, `.max()`, `.email()`, `.default()`
- Zod type inference: `z.infer<typeof schema>`
- Schema composition: `.omit()` chaining
- Enum validation with type-safe union

---

### `tests/validation/schemas.test.ts` (Validation Tests)

**Nodes extracted**:

- TestCase: describe 'User Schema Validation'
- TestCase: it 'should validate valid user'
- TestCase: it 'should reject invalid email'
- TestCase: it 'should provide default role'

**Edges**:

- REALIZES {role: 'TESTS'} → userSchema, createUserSchema, loginSchema
- LOCATION {role: 'IN_FILE'} → File
- IN_SNAPSHOT → Snapshot

**Code**:

```typescript
import { describe, it, expect } from 'vitest';
import { userSchema, createUserSchema, loginSchema } from '../../src/validation/schemas';

describe('User Schema Validation', () => {
  it('should validate valid user', () => {
    const user = {
      id: 'cuid123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as const,
      status: 'active' as const,
    };
    expect(userSchema.parse(user)).toEqual(user);
  });

  it('should reject invalid email', () => {
    const invalid = {
      id: 'cuid123',
      email: 'not-an-email',
      name: 'Test',
      role: 'user',
      status: 'active',
    };
    expect(() => userSchema.parse(invalid)).toThrow();
  });

  it('should provide default role', () => {
    const input = {
      id: 'cuid123',
      email: 'test@example.com',
      name: 'Test User',
    };
    const result = createUserSchema.parse(input);
    expect(result.role).toBe('user');
  });

  it('should validate login credentials', () => {
    const validLogin = {
      email: 'user@example.com',
      password: 'securepassword123',
    };
    expect(loginSchema.parse(validLogin)).toEqual(validLogin);
  });
});
```

**Tests**:

- Verifies TestCase extraction from validation tests
- Verifies REALIZES edges linking tests to schema symbols
- Tests Zod runtime validation patterns

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

### `src/models/comment.ts` (Snapshot-2: New Model)

**Nodes extracted**:

- Symbol: `IComment` (interface)
- Symbol: `Comment` (class)
- Symbol: `constructor` (method)
- Symbol: `getAuthor` (method)
- Symbol: `getContent` (method)

**Edges**:

- REFERENCES {type: 'TYPE_REF'} → IUser (author property)
- REFERENCES {type: 'TYPE_REF'} → Post (post property)
- IN_SNAPSHOT → Snapshot-2

**Code**:

```typescript
import { IUser } from './user';
import { Post } from './post';

export interface IComment {
  id: string;
  content: string;
  author: IUser;
  post: Post;
  createdAt: Date;
}

export class Comment {
  constructor(
    private id: string,
    private content: string,
    private author: IUser,
    private post: Post,
    private createdAt: Date = new Date(),
  ) {}

  getAuthor(): IUser {
    return this.author;
  }

  getContent(): string {
    return this.content;
  }

  getPost(): Post {
    return this.post;
  }
}
```

**Tests**:

- Verifies Comment class extraction
- Verifies TYPE_REF edges to IUser and Post
- Verifies method extraction

---

### `src/services/comment.service.ts` (Snapshot-2: New Service)

**Nodes extracted**:

- Symbol: `CommentService` (class)
- Symbol: `constructor` (method)
- Symbol: `createComment` (method)
- Symbol: `getComment` (method)
- Symbol: `deleteComment` (method)
- Symbol: `getCommentsByPost` (method)

**Edges**:

- REFERENCES {type: 'IMPORT'} → PostService
- REFERENCES {type: 'IMPORT'} → UserRepository
- REFERENCES {type: 'CALL'} → PostService.getPost
- REFERENCES {type: 'CALL'} → UserRepository.getUser
- MUTATES {operation: 'READ'} → Comment entity
- MUTATES {operation: 'WRITE'} → Comment entity
- IN_SNAPSHOT → Snapshot-2

**Code**:

```typescript
import { IComment, Comment } from '../models/comment';
import { PostService } from './post.service';
import { UserRepository } from './user.repository';
import { NotFoundError, ValidationError } from '../errors/custom.errors';
import type { PrismaClient } from '../prisma/generated/client/client';

export class CommentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly postService: PostService,
    private readonly userRepository: UserRepository,
  ) {}

  async createComment(postId: string, userId: string, content: string): Promise<IComment> {
    // Validate inputs
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Comment content cannot be empty');
    }

    // Verify post and user exist
    const post = await this.postService.getPost(postId);
    if (!post) {
      throw new NotFoundError(`Post with id ${postId} not found`);
    }

    const author = await this.userRepository.getUser(userId);
    if (!author) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }

    // Create comment (MUTATES WRITE)
    const comment = await this.prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        authorId: userId,
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      author,
      post: post as any,
      createdAt: comment.createdAt,
    };
  }

  async getComment(id: string): Promise<IComment | null> {
    // MUTATES READ
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return null;
    }

    const author = await this.userRepository.getUser(comment.authorId);
    const post = await this.postService.getPost(comment.postId);

    return {
      id: comment.id,
      content: comment.content,
      author: author!,
      post: post! as any,
      createdAt: comment.createdAt,
    };
  }

  async deleteComment(id: string): Promise<void> {
    // MUTATES WRITE (delete)
    try {
      await this.prisma.comment.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Comment with id ${id} not found`);
      }
      throw error;
    }
  }

  async getCommentsByPost(postId: string): Promise<IComment[]> {
    // MUTATES READ (multiple records)
    const comments = await this.prisma.comment.findMany({
      where: { postId },
    });

    return Promise.all(
      comments.map(async (c) => {
        const author = await this.userRepository.getUser(c.authorId);
        const post = await this.postService.getPost(c.postId);
        return {
          id: c.id,
          content: c.content,
          author: author!,
          post: post! as any,
          createdAt: c.createdAt,
        };
      }),
    );
  }
}
```

**Tests**:

- Verifies IMPORT edges (PostService, UserRepository)
- Verifies CALL edges between services
- Verifies MUTATES READ/WRITE edges
- Tests error handling for missing posts/users

---

### `src/services/public-post-list.service.ts` (Snapshot-3: Public Service)

**Nodes extracted**:

- Symbol: `PublicPostListService` (class)
- Symbol: `constructor` (method)
- Symbol: `getPublicPosts` (method)
- Symbol: `getPostsByUser` (method)
- Symbol: `searchPosts` (method)

**Edges**:

- REFERENCES {type: 'IMPORT'} → PostService
- REFERENCES {type: 'CALL'} → PostService.getPost
- MUTATES {operation: 'READ'} → Post entity
- IN_SNAPSHOT → Snapshot-3

**Code**:

```typescript
import type { PrismaClient } from '../prisma/generated/client/client';

export interface PublicPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  commentCount: number;
}

export class PublicPostListService {
  constructor(private readonly prisma: PrismaClient) {}

  async getPublicPosts(limit: number = 20, offset: number = 0): Promise<PublicPost[]> {
    // MUTATES READ - No auth required
    const posts = await this.prisma.post.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content || '',
      authorId: p.authorId,
      authorName: p.author.name,
      createdAt: p.createdAt,
      commentCount: p._count.comments,
    }));
  }

  async getPostsByUser(userId: string, limit: number = 20): Promise<PublicPost[]> {
    // MUTATES READ - Public user posts only
    const posts = await this.prisma.post.findMany({
      where: { authorId: userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content || '',
      authorId: p.authorId,
      authorName: p.author.name,
      createdAt: p.createdAt,
      commentCount: p._count.comments,
    }));
  }

  async searchPosts(query: string): Promise<PublicPost[]> {
    // MUTATES READ - Full-text search
    const posts = await this.prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        author: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content || '',
      authorId: p.authorId,
      authorName: p.author.name,
      createdAt: p.createdAt,
      commentCount: p._count.comments,
    }));
  }
}
```

**Tests**:

- Verifies public data access (no auth required)
- Verifies READ-only MUTATES edges
- Tests pagination with limit/offset
- Tests search functionality

---

## Git History & Branch-Based Snapshots

### Branch Strategy (Configuration-Driven)

The test repository uses **Git branches** (not linear commits) to represent snapshots. This aligns
with [ingest_spec.md §6.1](../ingest_spec.md#61-snapshot-selection--branch-based-indexing):

- `.indexer-config.json` specifies `trackedBranches: ["main", "snapshot-1", "snapshot-2", ...]`
- Each branch points to a commit with specific code/structure
- Indexer resolves branch → commit hash and creates immutable Snapshots
- Incremental indexing uses Git diff between old and new commit hashes per branch

### Snapshot Structure (5 Snapshots)

The repository contains **5 snapshots** accessible via Git branches. Each snapshot is immutable
(never rebased or force-pushed) and represents a point in development.

**Branch mapping** (from initial commit to latest):

- `snapshot-1` → Commit 1 (init: base structure)
- `snapshot-2` → Commit 2 (feat: user-service)
- `snapshot-3` → Commit 3 (feat: api-routes)
- `snapshot-4` → Commit 4 (refactor: rename service)
- `main` → Commit 5 (fix: email-validation) [**Latest/Default**]

### Implementation Workflow

Each snapshot is a **complete, functioning project** that can be indexed independently. Subsequent
snapshots modify the previous snapshot, adding or changing code—not foundational structure.

1. **snapshot-1** (Complete baseline):
   - Models (User, Post)
   - Services (UserService, AuthService, PostService, ExternalApiService)
   - API routes with 3 HTTP boundaries (GET/POST/DELETE /users)
   - Middleware and handlers
   - Utils (validators, helpers, logger)
   - Errors, constants, validation (Zod)
   - Documentation (4 markdown files)
   - Unit tests (models, utils, errors)
   - Integration tests (API, data-flow)
   - Prisma schema + migrations
   - All node/edge types present; fully indexed

2. **snapshot-2** (Modification 1 – Rename + Refactor):
   - Merge snapshot-1 → snapshot-2
   - **Change**: Rename UserService → UserRepository (tests delete+add symbol pattern)
   - Update all imports and usages in handlers, routes, index
   - Tests still pass
   - **Indexer tests**: Delete symbol, add symbol, IMPORT edge updates, call graph continuity

3. **snapshot-3** (Modification 2 – New Boundary + Service Method):
   - Merge snapshot-2 → snapshot-3
   - **Change**: Add new POST endpoint `POST /auth/login` (new Boundary, new handler)
   - Add new service method `AuthService.login(email, password)`
   - Update routes.ts, handlers.ts; add integration test
   - **Indexer tests**: New Boundary extraction, new Symbol (handler, service method), new CALL
     edges, LOCATION edges, REALIZES edges (test→handler)

4. **snapshot-4** (Modification 3 – Extract Shared Logic):
   - Merge snapshot-3 → snapshot-4
   - **Change**: Extract email validation logic into new UserRepository method
     `validateEmailFormat()`
   - Refactor createUser() to use new method (updates call graph)
   - Update unit tests
   - **Indexer tests**: New Symbol creation, updated CALL edges (CALLS from createUser to
     validateEmailFormat), symbol modification tracking

5. **main** (Modification 4 / Latest – Data Contract Change):
   - Merge snapshot-4 → main
   - **Change**: Update Zod schemas in validation/schemas.ts (add new fields, refine validation
     rules)
   - Update integration tests for new schema
   - **Indexer tests**: DataContract modification, type inference changes (z.infer updates),
     DEPENDS_ON library references (zod), symbol updates
   - Branch is ready for indexer testing

### `.indexer-config.json` (Configuration)

```json
{
  "version": "1.0",
  "codebases": [
    {
      "id": "test-typescript-app",
      "root": ".",
      "trackedBranches": ["main", "snapshot-1", "snapshot-2", "snapshot-3", "snapshot-4"],
      "languages": ["ts", "tsx", "js"],
      "defaultBranch": "main"
    }
  ],
  "graph": {
    "neo4jUri": "${NEO4J_URI}",
    "neo4jUser": "${NEO4J_USER}",
    "neo4jPassword": "${NEO4J_PASSWORD}"
  },
  "vectors": {
    "qdrantUrl": "${QDRANT_URL}",
    "collectionName": "texere-embeddings"
  },
  "security": {
    "denyPatterns": [".env", "*.key", "*.pem"],
    "allowPatterns": null
  },
  "embedding": {
    "model": "openai",
    "modelName": "text-embedding-3-small",
    "dimensions": 1536
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.3
  },
  "worker": {
    "type": "local",
    "concurrency": 4
  }
}
```

**Usage**: When indexer runs, it:

1. Loads `trackedBranches: ["main", "snapshot-1", "snapshot-2", "snapshot-3", "snapshot-4"]`
2. For each branch, resolves to commit hash: `git rev-parse main`, `git rev-parse snapshot-1`, etc.
3. Creates/updates Snapshot nodes with `snapshotType: "branch"` and branch-specific metadata
4. On branch updates, uses Git diff to detect incremental changes

---

### Snapshot Definitions

#### **Snapshot 1: `main` / `snapshot-1` – Initial Setup (Commit ABC1)**

**Files added**:

- `package.json` – Project metadata, dependencies (express, typescript, zod, vitest, etc.)
- `tsconfig.json` – TypeScript configuration
- `.env.example` – Environment template
- `.gitignore` – Standard TS gitignore
- `jest.config.js` or `vitest.config.ts` – Test runner config
- `README.md` – Project overview
- `src/index.ts` – Empty entry point (re-exports added in Commit 2)
- `prisma/schema.prisma` – Initial Prisma schema (empty or minimal)

**Symbols created**: 0 (no actual code yet, just configuration)

**Nodes created**:

- Codebase: test-typescript-app (root)
- Snapshot: commit hash abc1111... (will be provided)
- Module: src/, tests/, docs/, prisma/ (directories)
- File: All 8 new files
- SpecDoc: README.md (basic)

**Edges created**:

- CONTAINS: Module → Module, Module → File (hierarchy)
- IN_SNAPSHOT: All nodes (8 files)
- LOCATION: SpecDoc → File

**Total snapshot size**: 8 files, 0 code symbols, 3-4 data nodes

**Indexing behavior**: All files indexed fresh. No code extraction.

**Git status**:

```
A  .env.example
A  .gitignore
A  README.md
A  jest.config.js
A  package.json
A  prisma/schema.prisma
A  src/index.ts
A  tsconfig.json
```

---

#### **Snapshot 2: `snapshot-1` – User Service (Commit ABC2)**

**Files added**:

- `src/models/user.ts` – User types and interfaces
- `src/models/post.ts` – Post model class
- `src/models/schemas.ts` – Type definitions (placeholder for v1)
- `src/services/user.service.ts` – UserService class with CALL edges
- `src/services/auth.service.ts` – AuthService class (tests circular import to helpers)
- `src/utils/validators.ts` – Validator utility functions
- `src/utils/helpers.ts` – Helper functions (circular import)
- `src/utils/logger.ts` – Logger utility
- `src/constants/index.ts` – Constants (4 exports)
- `src/errors/custom.errors.ts` – Error classes
- `src/config/env.config.ts` – Environment configuration
- `tests/unit/services.test.ts` – Unit tests for services
- `docs/README.md` – User Service Module documentation

**Symbols created** (20+ new):

- IUser (interface)
- UserRole (type)
- UserStatus (enum)
- Post (class + 3 methods)
- UserService (class + 2 methods)
- AuthService (class + 2 methods)
- 3x validators (validateEmail, validatePassword, validatePhone)
- 2x helpers (sanitizeEmail, verifyWithAuth)
- logger (const/object)
- 3x error classes (ValidationError, AuthenticationError, NotFoundError)
- 4x constants (API_VERSION, MAX_USERS_PER_PAGE, TOKEN_EXPIRY_MINUTES, DEFAULT_CONFIG)
- config (const)

**Nodes created**:

- Symbols: 20+ (all marked INTRODUCED in Snapshot 2)
- TestCases: 3 (describe + 3 it blocks in services.test.ts)
- SpecDoc: 1 (README.md)
- DataContract: 0 (optional for v1)

**Edges created**:

- REFERENCES {type: 'IMPORT'}: 8+ (auth.service → helpers, validators, etc.)
- REFERENCES {type: 'CALL'}: 10+ (UserService → validators, AuthService)
- REFERENCES {type: 'TYPE_REF'}: 5+ (Post → IUser, method return types)
- MUTATES {operation: 'READ'}: 2 (getUser, getPost)
- MUTATES {operation: 'WRITE'}: 1 (createUser)
- REALIZES {role: 'TESTS'}: 3 (test cases → services)
- DOCUMENTS {type: 'MODULE'}: 1 (README → src/)
- IN_SNAPSHOT: All 20+ symbols
- CONTAINS: File → Symbol (20+)
- TRACKS {event: 'INTRODUCED'}: 20+ (all new symbols)

**Total snapshot size**: 8 + 13 files = 21 files, 20+ symbols, 3 test cases, 1 spec doc

**Special features**:

- Circular import: `auth.service.ts` ↔ `helpers.ts` (both import each other)
- Service dependencies: UserService → AuthService (CALL chain)
- Type references: Post.author uses IUser type

**Indexing behavior**:

- Git diff reports 13 added files (all the new ones)
- Only these 13 files indexed
- Snapshot 1 files unchanged (reused)
- TRACKS {event: 'INTRODUCED'} created for all new symbols

**Git status**:

```
A  docs/README.md
A  src/config/env.config.ts
A  src/errors/custom.errors.ts
A  src/models/post.ts
A  src/models/schemas.ts
A  src/models/user.ts
A  src/services/auth.service.ts
A  src/services/user.service.ts
A  src/utils/helpers.ts
A  src/utils/logger.ts
A  src/utils/validators.ts
A  src/constants/index.ts
A  tests/unit/services.test.ts
```

---

#### **Snapshot 3: `snapshot-2` – API Routes & Endpoints (Commit ABC3)**

**Files added**:

- `src/api/routes.ts` – Express routes with 3 endpoints (GET /users/:id, POST /users, DELETE
  /users/:id)
- `src/api/middleware.ts` – Middleware: authMiddleware, errorHandler
- `src/api/handlers.ts` – Request/response handler utilities (optional, for handler extraction)
- `src/validation/schemas.ts` – Zod schemas (userSchema, createUserSchema, loginSchema, postSchema)
- `tests/validation/schemas.test.ts` – Zod schema validation tests
- `tests/integration/api.integration.test.ts` – Integration tests for endpoints
- `docs/API.md` – API documentation
- `prisma/migrations/init.sql` – SQL schema file (basic DDL)

**Symbols created** (15+ new):

- 3x route handlers (async functions in routes.ts)
- authMiddleware (function)
- errorHandler (function)
- 4x Zod schema objects (userSchema, createUserSchema, loginSchema, postSchema)
- 4x inferred types (User, CreateUserInput, LoginInput, Post) via z.infer

**Nodes created**:

- Symbols: 15+ (all marked INTRODUCED)
- Boundaries: 3 (GET /users/:id, POST /users, DELETE /users/:id)
- TestCases: 6+ (3 in api.integration.test.ts + 4 in schemas.test.ts)
- SpecDoc: 1 (API.md) + optional handlers doc
- DataContract: 4 (Zod schema nodes) + 1 (Prisma initial)

**Edges created**:

- REFERENCES {type: 'CALL'}: 3+ (routes call UserService methods)
- REFERENCES {type: 'IMPORT'}: 5+ (routes import UserService, middleware, etc.)
- REFERENCES {type: 'IMPORT'}: 1 (validation imports zod)
- LOCATION {role: 'HANDLED_BY'}: 3 (boundaries → handler functions)
- LOCATION {role: 'IN_FILE'}: 3 (boundaries IN_FILE routes.ts)
- REALIZES {role: 'VERIFIES'}: 2 (integration tests verify endpoints)
- REALIZES {role: 'TESTS'}: 4 (schema tests test Zod schemas)
- DEPENDS_ON {kind: 'LIBRARY'}: 1 (zod)
- DOCUMENTS {type: 'ENDPOINT'}: 2 (API.md documents endpoints)
- IN_SNAPSHOT: All 15+ symbols
- CONTAINS: File → Symbol

**Total snapshot size**: 21 + 8 files = 29 files, 35+ symbols, 7+ test cases, 2 spec docs

**Special features**:

- HTTP method detection (GET, POST, DELETE)
- Middleware chaining
- Zod schema extraction with method chaining
- Type inference validation

**Indexing behavior**:

- Git diff reports 8 added files
- Only these files indexed
- Snapshot 1-2 files unchanged (reused)
- Boundary detection: 3 new nodes
- TRACKS {event: 'INTRODUCED'} for all new symbols

**Git status**:

```
A  docs/API.md
A  prisma/migrations/init.sql
A  src/api/handlers.ts
A  src/api/middleware.ts
A  src/api/routes.ts
A  src/validation/schemas.ts
A  tests/integration/api.integration.test.ts
A  tests/validation/schemas.test.ts
```

---

#### **Snapshot 4: `snapshot-3` – Refactor (Commit ABC4)**

**Files modified**:

- `src/services/user.service.ts` – Class renamed + method signature changes

**Specific changes in user.service.ts**:

```typescript
// BEFORE (Snapshot 3):
export class UserService {
  constructor(private authService: AuthService) {}
  async createUser(email: string): Promise<IUser> { ... }
  async getUser(id: string): Promise<IUser> { ... }
}

// AFTER (Snapshot 4):
export class UserRepository {  // RENAMED
  constructor(private authService: AuthService) {}
  async createUser(email: string, name: string): Promise<IUser> { ... }  // MODIFIED signature
  async getUserById(id: string): Promise<IUser> { ... }  // RENAMED method
  async deleteUser(id: string): Promise<void> { ... }  // NEW method
}
```

**Symbols affected**:

- DELETED: UserService (class)
- DELETED: UserService.createUser (old signature)
- DELETED: UserService.getUser
- INTRODUCED: UserRepository (class)
- INTRODUCED: UserRepository.createUser (new signature)
- INTRODUCED: UserRepository.getUserById (renamed)
- INTRODUCED: UserRepository.deleteUser (new method)

**Files that will need re-indexing** (due to broken imports):

- `src/api/routes.ts` (imports UserService, now broken)
- `tests/unit/services.test.ts` (imports UserService, now broken)

**Edges affected**:

- REFERENCES {type: 'IMPORT'}: routes.ts imports UserService (becomes stale/broken in v1)
- REFERENCES {type: 'CALL'}: routes.ts calls UserService methods (old names)
- REALIZES: tests import and test UserService (old name)

**Indexing behavior** (v1 semantics):

- Git diff reports 1 modified file
- Only user.service.ts re-indexed
- Old symbols (UserService, getUser, etc.) are deleted
- New symbols (UserRepository, getUserById, deleteUser) are created with INTRODUCED
- TRACKS {event: 'MODIFIED'} on user.service.ts file itself
- **v1 limitation**: Other files (routes.ts, tests) now have broken references
  - They still reference old symbol names
  - Indexer cannot resolve these (missing target symbols)
  - This is expected v1 behavior (would be fixed in v2 with smarter rename detection)

**Symbol count delta**:

- Removed: 1 class + 2 methods = 3 symbols
- Added: 1 class + 3 methods = 4 symbols
- Net: +1 symbol

**Total snapshot size**: 29 files, 36 symbols (35+ - 3 + 4), but with broken references

**Validation expectation**:

- UserService should NOT exist in Snapshot 4
- UserRepository should exist in Snapshot 4
- routes.ts should still exist but have stale REFERENCES edges pointing to non-existent symbols

**Git status**:

```
M  src/services/user.service.ts
```

---

#### **Snapshot 5: `snapshot-4` – Bug Fix (Commit ABC5)**

**Files modified**:

- `src/utils/validators.ts` – validateEmail function regex updated + add new validator

**Specific changes in validators.ts**:

```typescript
// BEFORE (Snapshots 1-4):
export const validators = {
  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // OLD regex
  },
  validatePassword(pwd: string): boolean {
    return pwd.length >= 8;
  },
  validatePhone(phone: string): boolean {
    return /^\d{10}$/.test(phone);
  },
};

// AFTER (Snapshot 5):
export const validators = {
  validateEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email); // NEW regex (RFC-like)
  },
  validatePassword(pwd: string): boolean {
    return pwd.length >= 8;
  },
  validatePhone(phone: string): boolean {
    return /^\d{10}$/.test(phone);
  },
  validateUsername(username: string): boolean {
    // NEW validator
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  },
};
```

**Symbols affected**:

- MODIFIED: validateEmail (same location, same name, body changed)
- UNCHANGED: validatePassword
- UNCHANGED: validatePhone
- INTRODUCED: validateUsername (new validator)

**Symbol IDs**:

- validateEmail: ID should be stable (same path, name, line number)
  - Still `src/utils/validators.ts:validateEmail:7:2` (assuming line 7)
  - Even though body changed, ID doesn't change
- validateUsername: ID is new (`src/utils/validators.ts:validateUsername:19:2`, assuming line 19)

**Edges affected**:

- REFERENCES from UserService.createUser → validators.validateEmail (still points to validateEmail)
  - No change in edge itself, but validateEmail node is updated
- New REFERENCES if anyone uses validateUsername (none in v1 test repo)

**Indexing behavior**:

- Git diff reports 1 modified file
- Only validators.ts re-indexed
- validateEmail symbol updated in place (same ID)
- validateUsername symbol created as new (INTRODUCED)
- TRACKS {event: 'MODIFIED'} → Snapshot 5 for validateEmail
- TRACKS {event: 'INTRODUCED'} → Snapshot 5 for validateUsername

**Symbol count delta**:

- Modified: 1 symbol (validateEmail)
- Added: 1 symbol (validateUsername)
- Net: +1 symbol

**Total snapshot size**: 29 files, 37 symbols (36 - 0 + 1), all references intact

**Validation expectation**:

- validateEmail exists in all snapshots (1-5)
- validateEmail in Snapshot 5 has updated body
- validateEmail in Snapshots 1-4 have old body (or not indexed at all)
- TRACKS {event: 'MODIFIED'} only in Snapshot 5
- TRACKS {event: 'INTRODUCED'} for validateUsername only in Snapshot 5

**Git status**:

```
M  src/utils/validators.ts
```

---

### Git Branch Structure (Setup Guide)

Each snapshot is accessible via a Git branch. This structure enables configuration-driven indexing
per [configuration_spec.md §3](../configuration_spec.md#3-tracked-branches).

**Branch creation steps**:

```bash
# Start on main
git checkout -b main
# (Initial setup files)
git commit -m "init: setup"
# Commit ABC1

# Create snapshot-1 branch at this point
git branch snapshot-1 HEAD

# Add user service files
# git add src/models/... src/services/... tests/unit/... docs/README.md
git commit -m "feat: user-service"
# Commit ABC2

# Create snapshot-2 branch at this point
git branch snapshot-2 HEAD

# Add API routes files
# git add src/api/... src/errors/... src/config/... tests/integration/...
git commit -m "feat: api-routes"
# Commit ABC3

# Create snapshot-3 branch at this point
git branch snapshot-3 HEAD

# Refactor: rename UserService → UserRepository
# git add src/services/user.service.ts
git commit -m "refactor: rename-service"
# Commit ABC4

# Create snapshot-4 branch at this point
git branch snapshot-4 HEAD

# Fix: update validateEmail regex
# git add src/utils/validators.ts
git commit -m "fix: email-validation"
# Commit ABC5
```

**Result**: Five branches—`main`, `snapshot-1`, `snapshot-2`, `snapshot-3`, `snapshot-4`—each
pointing to a distinct commit with immutable code state.

**Note**: `main` and `snapshot-1` point to the same commit (ABC1). This is optional but useful for
testing both "default branch indexing" and "alternate branch indexing" scenarios.

---

### Incremental Validation Table

| Scenario         | From Branch | To Branch  | Git Diff   | Expected Behavior                                                   |
| ---------------- | ----------- | ---------- | ---------- | ------------------------------------------------------------------- |
| Fresh index      | (none)      | snapshot-1 | All files  | All files indexed; Codebase, Module, File, Symbol nodes created     |
| Add service code | snapshot-1  | snapshot-2 | +13 files  | New symbols, test cases, calls indexed; prior files untouched       |
| Add API code     | snapshot-2  | snapshot-3 | +8 files   | Boundary detection; handler LOCATION edges created                  |
| Rename symbol    | snapshot-3  | snapshot-4 | 1 modified | UserService deleted; UserRepository added; broken imports detected  |
| Modify validator | snapshot-4  | snapshot-5 | 1 modified | validateEmail symbol unchanged (same id); body updated; no deletion |

---

### Incremental Testing Workflow

**Test setup**: Load `.indexer-config.json` with
`trackedBranches: ["main", "snapshot-1", "snapshot-2", "snapshot-3", "snapshot-4"]`. Indexer
resolves each branch to its commit hash and indexes incrementally.

```typescript
// Pseudo-test outline
describe('Branch-Based Incremental Indexing', () => {
  let indexer: TexereIndexer;
  let config: IndexerConfig;

  beforeAll(async () => {
    // Load .indexer-config.json with trackedBranches
    config = loadConfig('.indexer-config.json');
    indexer = new TexereIndexer(config);
  });

  it('Snapshot 1 (snapshot-1 branch): Base structure', async () => {
    // Resolve snapshot-1 branch to commit ABC1 via git rev-parse
    // Index snapshot-1
    // Assert: Codebase, Snapshot (snapshotType: "branch", branch: "snapshot-1"), Module nodes
    // Assert: File count = 8, Symbol count = 0
    // Assert: All nodes have IN_SNAPSHOT edge
  });

  it('Snapshot 2 (snapshot-1 branch update): New symbols introduced', async () => {
    // Update snapshot-1 branch to commit ABC2
    // Compute Git diff: snapshot-1@old..snapshot-1@new
    // Reindex changed files
    // Assert: 20+ new symbols created with TRACKS {event: 'INTRODUCED'} → Snapshot 2
    // Assert: TestCases extracted from *.test.ts files
    // Assert: Call edges between services (UserService.createUser → validators.validateEmail)
  });

  it('Snapshot 3 (snapshot-2 branch): Boundaries & endpoints extracted', async () => {
    // Index snapshot-2 branch (commit ABC3)
    // Assert: 3 Boundary nodes created (GET /users/:id, POST /users, DELETE /users/:id)
    // Assert: LOCATION {role: 'HANDLED_BY'} edges link boundaries to handler symbols
    // Assert: Integration test cases linked via VERIFIES
  });

  it('Snapshot 4 (snapshot-3 branch): Rename = delete + add (v1 limitation)', async () => {
    // Index snapshot-3 branch (commit ABC4, UserService → UserRepository rename)
    // Assert: Old UserService symbol marked deleted/removed
    // Assert: New UserRepository symbol has TRACKS {event: 'INTRODUCED'}
    // Assert: Files importing old UserService name have broken references (detected in validation)
    // Assert: Tests demonstrate v1 limitation and guide future v2 rename tracking
  });

  it('Snapshot 5 (snapshot-4 branch): Modified symbol tracking', async () => {
    // Index snapshot-4 branch (commit ABC5, validateEmail regex updated)
    // Assert: validateEmail symbol ID stable (same name, same location)
    // Assert: Symbol has TRACKS {event: 'MODIFIED'} → Snapshot 5
    // Assert: Previous snapshots retain old version of validateEmail
    // Assert: New validatePhone function has TRACKS {event: 'INTRODUCED'} → Snapshot 5
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

### Edge Case 6: Zod Schema Parsing & Type Inference

**File**: `src/validation/schemas.ts`

**Behavior**:

- Zod schema variables detected as Symbols (userSchema, createUserSchema, etc.)
- Zod method chaining parsed (.object(), .string(), .email(), .min(), .max(), .default(), .enum())
- Type inference via `z.infer<typeof schema>` creates type alias Symbols
- Exported types (User, CreateUserInput, LoginInput) recognized as DataContract-like nodes
- Schema composition (z.object.omit()) understood

**Tests**:

```typescript
it('extracts Zod schema definitions as symbols', async () => {
  const userSchema = result.symbols.find((s) => s.name === 'userSchema');
  const createUserSchema = result.symbols.find((s) => s.name === 'createUserSchema');
  expect([userSchema, createUserSchema]).toHaveLength(2);
});

it('extracts Zod type inferences as type aliases', async () => {
  const userType = result.symbols.find((s) => s.name === 'User' && s.kind === 'type');
  expect(userType).toBeDefined();
  // Type should reference userSchema via z.infer
});

it('creates REFERENCES edges for Zod library usage', async () => {
  // validation/schemas.ts should have REFERENCES {type: 'IMPORT'} → zod
  // validation/schemas.ts should have DEPENDS_ON {kind: 'LIBRARY'} → zod
});

it('links validation tests to schemas via REALIZES', async () => {
  // tests/validation/schemas.test.ts should have
  // REALIZES {role: 'TESTS'} → userSchema, createUserSchema, loginSchema
});
```

---

### Edge Case 7: Prisma Schema Parsing

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

### Edge Case 8: Error Handling & Try-Catch

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

### Edge Case 9: Re-exports

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
- [ ] **DEPENDS_ON {kind: 'LIBRARY'}**: Third-party libraries (axios, zod) (2+ edges)
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
- [ ] **Zod schemas**: Schema definitions (z.object) extracted as symbols
- [ ] **Zod type inference**: z.infer<typeof schema> creates type alias symbols
- [ ] **Zod method chaining**: .object(), .string(), .email(), .min(), .max(), .default(), .enum()
      recognized
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

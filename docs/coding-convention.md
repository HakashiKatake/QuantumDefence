# Coding Conventions & Guidelines
## Project QuantumDefense: Integrated Multi-Domain Military Command & Control Platform

**Version:** 1.0.0  
**Date:** June 2026  
**Status:** Approved  
**Author:** Technical Board  

---

## 1. General Principles
All developers working on Project QuantumDefense must adhere to these foundational software engineering principles:
* **Don't Repeat Yourself (DRY):** Reuse code through modular helper files and shared middleware. Avoid copy-pasting code blocks across microservices.
* **Keep It Simple, Stupid (KISS):** Prefer simple, readable logic over clever, complex code. Code is read more often than it is written.
* **You Aren't Gonna Need It (YAGNI):** Do not write code for speculative future features. Build only what satisfies the approved requirements.
* **Clean Code:** Use meaningful variable names, write self-documenting code, and limit comments to explaining *why* something is done, not *what* the code does.

---

## 2. Naming Conventions

### 2.1. File System & Directories
* **General Directories:** Use `kebab-case` (lowercase with hyphens). E.g., `auth-service/`, `command-service/`, `data-helpers/`.
* **Standard JavaScript Files:** Use `kebab-case` (lowercase with hyphens). E.g., `authenticate-token.js`, `prisma-client.js`.
* **React Component Files:** Use `PascalCase` (Capitalize each word). E.g., `TacticalMap.jsx`, `AlertTicker.jsx`.
* **Prisma Schema Files:** Named `schema.prisma` inside a folder named `prisma/`.

### 2.2. Code Naming
* **Variables & Functions:** Use `camelCase`. E.g., `const activeThreats = [];`, `function calculateReadiness() {}`.
* **Constants:** Use `SCREAMING_SNAKE_CASE`. E.g., `const JWT_EXPIRATION_TIME = '2h';`, `const DEFAULT_MAP_ZOOM = 5;`.
* **Database Columns:** Use `camelCase` for model fields in Prisma schemas, which Prisma maps to standard columns.
* **Database Tables:** Use `PascalCase` for model names. E.g., `model AuditLog`.
* **CSS Custom Properties & Classes:** Use `kebab-case`. E.g., `--color-primary-cyan`, `.btn-action-submit`.

### 2.3. Platform Resources
* **Docker Images:** Use lowercase and hyphens. E.g., `quantum-defense/auth-service:latest`.
* **Kubernetes Resources:** Use lowercase and hyphens. E.g., `auth-deployment`, `db-service`.

---

## 3. JavaScript & Node.js Conventions
* **Module System:** Use ES Modules (import/export syntax) for modern Node.js and React execution.
  ```javascript
  // Correct
  import express from 'express';
  export const startServer = () => {};
  ```
* **Asynchronous Programming:** Use `async/await` syntax. Avoid callback chains or naked promise chains.
  ```javascript
  // Correct
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { error });
  }
  ```
* **Error Handling:** All route handlers must forward errors to the Express error middleware. Do not let requests hang or fail silently.
  ```javascript
  // Express routing catch
  router.get('/assets/:id', async (req, res, next) => {
    try {
      const asset = await getAssetById(req.params.id);
      res.json({ success: true, data: asset });
    } catch (error) {
      next(error); // Express global error handler takes it
    }
  });
  ```

---

## 4. React Conventions
* **Component Paradigm:** Use Functional Components with Hooks. Class components are strictly prohibited.
* **Component Anatomy:** Organize component files with imports, prop type definitions, component declaration, helper functions, and export:
  ```jsx
  import React, { useState, useEffect } from 'react';
  import PropTypes from 'prop-types';
  
  export const StatusBadge = ({ status }) => {
    // 1. Hooks
    const [color, setColor] = useState('gray');

    // 2. Effects
    useEffect(() => {
      setColor(status === 'ACTIVE' ? 'green' : 'red');
    }, [status]);

    // 3. Render
    return <span className={`badge badge-${color}`}>{status}</span>;
  };

  StatusBadge.propTypes = {
    status: PropTypes.string.isRequired
  };
  ```
* **Shared State:** Use React Context combined with custom hooks to avoid prop drilling. E.g., `const { user, logout } = useAuth();`.

---

## 5. API Conventions
* **RESTful Routing:** Use plural nouns for resource collections and logical hierarchy:
  * `GET /api/threats` (List of threats)
  * `GET /api/threats/:id` (Single threat details)
  * `POST /api/threats` (Create new threat record)
  * `PUT /api/threats/:id` (Update complete threat state)
  * `DELETE /api/threats/:id` (Remove threat record)
* **Response Wrapper Envelope:** All HTTP responses must return a standard JSON envelope structure:
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "message": "Resource fetched successfully"
  }
  ```
  Failed API execution response structure:
  ```json
  {
    "success": false,
    "data": null,
    "error": "RecordNotFound",
    "message": "Asset with id 12 not found in repository"
  }
  ```
* **Request Validation:** Input structures must be validated at the route boundary using Zod schemas before hitting business controllers.

---

## 6. Git Conventions
* **Branching Model:** Use short-lived feature branches branching off `main`:
  * Features: `feature/user-authentication`
  * Bug fixes: `bugfix/socket-reconnect-loop`
  * Infrastructure/DevOps updates: `ops/vault-dynamic-keys`
* **Conventional Commits:** Write clear commit messages matching this semantic format:
  * `feat: add real-time telemetry updates via WebSockets`
  * `fix: correct token validation check in command-service middleware`
  * `docs: update setup commands in technical documentation`
  * `chore: update database driver packages`

---

## 7. Docker & Container Guidelines
* **Base Images:** Always specify lightweight Alpine variants. E.g., `node:24-lts-alpine` or `postgres:18-alpine`.
* **Security:** Never run container commands as the system `root` user. Define a dedicated application execution user:
  ```dockerfile
  USER node
  ```
* **Exclusion List:** Maintain a `.dockerignore` file in every directory to prevent uploading local node modules, environment files, or documentation assets to the daemon context.

---

## 8. Structured Logging Guidelines
* **Output Stream:** Write all application logs directly to stdout using JSON format.
* **Log Levels:** Use standard logging severity levels appropriately:
  * `ERROR`: Critical failures (database connections, auth library exceptions).
  * `WARN`: Non-fatal issues (failed logins, retry alerts, API validation rejections).
  * `INFO`: Key lifecycle events (server initialized, database migration applied).
  * `DEBUG`: Telemetry drift values, socket packet logs (disabled in production).
* **Data Privacy:** Never write sensitive values (passwords, JWT secrets, database connection tokens) to log streams. Mask or strip these keys before writing output.

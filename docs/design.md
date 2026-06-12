# Design Specification Document
## Project QuantumDefense: Integrated Multi-Domain Military Command & Control Platform

**Version:** 1.0.0  
**Date:** June 2026  
**Status:** Approved  
**Author:** Lead UI/UX Designer  

---

## 1. Design Philosophy
The UI/UX design of QuantumDefense is engineered to reflect the operational realities of modern military command centers. It prioritizes **data density**, **visual hierarchy**, and **situational urgency**.

* **Operational Clarity:** Minimize cognitive load. Primary metrics and alerts must be visible without scrolling or nested navigation.
* **Tactical Dark Aesthetic:** Use high-contrast indicators against a deep navy background to reduce eye strain during long shifts.
* **Dynamic Feedback:** Subtle animations (such as radar pulse scans) indicate live telemetry, showing the system is active.

---

## 2. Color System
The color system uses specific hex codes mapped to combat status and threat conditions:

```
Palette:
├─ Backgrounds
│  ├─ Navy Main:    #0a1628 (Deep body background)
│  └─ Charcoal card: #1a2744 (Card and container background)
├─ UI Accents
│  ├─ Neon Cyan:    #00d4ff (Focus borders, telemetry links, active tabs)
│  └─ Bright Green: #00ff88 (Operational states, normal status, readiness)
└─ Operational Warnings
   ├─ Amber Alert:  #ffaa00 (Medium/High threats, pending actions)
   └─ Threat Red:   #ff3366 (Critical threat alert, emergency override)
```

### Domain Categorization Colors
Operational domains are color-coded to group data visually on screens:
* **Land Domain:** Olive Green (`#8b9d77`)
* **Air Domain:** Sky Blue (`#4ea8de`)
* **Naval Domain:** Deep Ocean Blue (`#1d3557`)
* **Cyber Domain:** Tech Green (`#00f5d4`)
* **Space Domain:** Cosmic Purple (`#7209b7`)

---

## 3. Typography
The system utilizes two primary sans-serif font families to balance readability with high-density data exposition:

* **Primary Interface Font:** **Inter** (fallback: System Sans-Serif)
  * Used for: Titles, labels, inputs, forms, and general interface text.
  * Sizing scale:
    * Page Title (Header): `24px` / Bold (Weight 700)
    * Component Header: `16px` / Semi-Bold (Weight 600)
    * Body text: `14px` / Regular (Weight 400)
* **Secondary Telemetry Font:** **JetBrains Mono** (fallback: Courier / Monospace)
  * Used for: Latitude/longitude values, coordinates, timestamps, network payloads, telemetry grids, and active counts.
  * Sizing: `13px` / Regular or Medium (Weight 500)

---

## 4. Component Library Spec

### 4.1. Layout Containers
* **Sidebar Navigation:** A narrow vertical layout anchored to the left. Displays clean, minimalist military-themed icons (Radar, Warning, Mission, Shield, Settings). Collapses to icon-only on smaller viewports.
* **Header Bar:** Displays the current authenticated user's role (e.g., `ROLE: THEATER COMMANDER`), system date, real-time UTC clock, and a global system status indicator.
* **Data Card:** A container with background `#1a2744`, a thin border of `#00d4ff` (opacity 15%), and rounded corners of `4px`. Hovering adds a border highlight.

### 4.2. Common UI Controls
* **Status Badge:** Inline badges showing operational states (`ACTIVE`, `STANDBY`, `DEPLOYED`, `NEUTRALIZED`).
* **Severity Indicator:** Rounded text badges styled based on severity:
  * `CRITICAL`: Background `#ff3366` (opacity 20%), text `#ff3366`, blinking border.
  * `HIGH`: Background `#ffaa00` (opacity 20%), text `#ffaa00`.
  * `MEDIUM`: Background `#00d4ff` (opacity 20%), text `#00d4ff`.
* **Standard Button:** Cyan borders with transparent backgrounds. Hovering fills the button with solid cyan, changing text to dark navy.

### 4.3. Maps & Telemetry Controls
* **Tactical Map (Leaflet.js):** Rendered inside a dark map skin (CartoDB DarkMatter tiles). Map handles zoom and pan bounds.
* **Map Markers (milsymbol):** Custom SVG rendering of standard MIL-STD-2525 military symbols:
  * Hostile targets are colored red (rhombus shape).
  * Friendly assets are colored blue (rectangle shape).
* **Threat Circle Overlay:** Translucent red circles showing threat range zones based on severity.

---

## 5. Page Layout & UI Walkthrough

```
+-------------------------------------------------------------------------+
| [NAVBAR] | User: Commander | SYSTEM: NOMINAL | UTC: 2026-06-12 13:17 |  |
|----------+--------------------------------------------------------------|
| [RADAR]  | +----------------------------------+ +---------------------+ |
| [ALERTS] | |                                  | |   DOMAIN READINESS  | |
| [THREAT] | |                                  | | Land: [==========] | |
| [MISSION]| |         TACTICAL MAP             | | Air:  [=======   ] | |
| [ASSETS] | |         (Leaflet.js)             | | Naval:[========= ] | |
| [ADMIN]  | |                                  | | Space:[====      ] | |
|          | +----------------------------------+ +---------------------+ |
|          | +----------------------------------+ +---------------------+ |
|          | | ALERT TICKER (Real-time update)  | | ACTIVE THREAT LOG   | |
|          | | [13:15] CRITICAL AIR DETECTED... | | T-99 (Hostile Fighter) | |
|          | +----------------------------------+ +---------------------+ |
+-------------------------------------------------------------------------+
```

### 5.1. Login Page
* **Layout:** Centered login card, deep navy background.
* **Key Components:** Military-style login form, title text "QUANTUMDEFENSE C2 AUTHENTICATION", username/password fields, and role selection dropdown.

### 5.2. Dashboard Page (Common Operating Picture)
* **Layout:** Grid with main map (2/3 width) and domain metric sidebar (1/3 width).
* **Key Components:** Leaflet map, domain status cards, active threat counter, readiness dials, real-time alert ticker at the bottom.

### 5.3. Threats Page
* **Layout:** Vertical split. Top shows threat overview statistics; bottom contains the threat register table and threat submission form.
* **Key Components:** Threat registry grid (table sorting by severity, coordinates, age), "Neutralize" actions, interactive map overlay.

### 5.4. Missions Page
* **Layout:** Horizontal kanban-style columns for states (`PLANNING`, `ACTIVE`, `COMPLETED`, `FAILED`).
* **Key Components:** Mission detail cards, "Create Mission" modal, assigned units listing, progress bar indicators.

### 5.5. Alerts Page
* **Layout:** Stream view of alerts ordered by timestamp.
* **Key Components:** Highlight filter controls (critical/high only), Acknowledge buttons, print report button.

### 5.6. Assets Inventory Page
* **Layout:** Grid view of operational cards.
* **Key Components:** Domain filter tabs, details editing modal (coordinates, fuel, speed), add asset form.

---

## 6. Micro-Interactions & Animations
* **Alert Radar Pulse:** Threat indicators blink with a radial pulse:
  ```css
  @keyframes radar-pulse {
    0% { transform: scale(0.9); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  .marker-hostile::after {
    content: '';
    position: absolute;
    border: 2px solid #ff3366;
    border-radius: 50%;
    animation: radar-pulse 1.8s infinite ease-out;
  }
  ```
* **Status Updates:** Data cells glow cyan for 500ms when their numeric value changes via WebSocket.
* **Page Transitions:** Views fade in smoothly over 200ms using CSS opacity transitions to maintain a polished feel.

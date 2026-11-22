# CareBridge Mobile Application

An enterprise-grade emergency medical response and resource allocation mobile application built with **React Native**, **Expo SDK 58**, **Expo Router**, and **Firebase Firestore / Auth**.

---

## 🌟 Overview & Architecture

CareBridge Mobile is designed for high-stakes emergency situations where real-time coordination between patients, attendants, emergency coordinators, and healthcare resource providers is mission-critical.

The application connects directly to the production CareBridge Firebase backend (`carebridge-90059`) sharing live Firestore collections, authentication sessions, and security rules with the CareBridge web application without duplicating databases or collections.

```
carebridge_mobile2/
├── app/
│   ├── _layout.tsx                     # Root stack layout with SafeArea and Auth Provider
│   ├── index.tsx                       # Landing & splash with role-based routing & emergency hotline
│   ├── (auth)/
│   │   ├── login.tsx                   # Unified login (Patient, Attendant, Providers, Admin direct auth)
│   │   ├── signup.tsx                  # Public registration with strict admin role protection
│   │   └── forgot-password.tsx         # Firebase password reset workflow
│   ├── (patient)/
│   │   ├── index.tsx                   # Patient & Attendant Dashboard (stats, case list, tracking)
│   │   ├── new-case.tsx                # Emergency case creation wizard (Triage, services, location, consent)
│   │   ├── case-details.tsx            # Live telemetry, assigned providers, additional resource requests
│   │   └── patient-links.tsx           # Attendant linked patients management with consent
│   ├── (admin)/
│   │   └── index.tsx                   # Central Emergency Coordinator command center (allocations & triage)
│   ├── (provider)/
│   │   ├── hospital.tsx                # Hospital bed/ICU/ventilator capacity & admission requisitions
│   │   ├── blood-bank.tsx              # Blood unit inventory management & requisition accept/decline
│   │   ├── oxygen.tsx                  # Medical oxygen cylinders/concentrators & delivery requisitions
│   │   ├── ambulance.tsx               # Emergency fleet management & 7-step live trip lifecycle stepper
│   │   └── doctor.tsx                  # Attending physician clinical evaluation, vitals, & EHR timeline
│   └── (common)/
│       ├── notifications.tsx           # Real-time notification center with mark read & clear
│       └── profile.tsx                 # User profile dossier, credential management, and sign out
├── components/
│   └── common/                         # Shared UI primitives: Badge, Button, Card, Header, Icons, Input
├── configuration/
│   └── firebase.ts                     # Production Firebase client with AsyncStorage persistent auth
├── constants/
│   ├── colors.ts                       # Official CareBridge medical color palette
│   └── theme.ts                        # Spacing, typography, shadows, borders
├── context/
│   └── AuthContext.tsx                 # Firebase Auth session state & role resolver
├── services/
│   └── dataService.ts                  # Firestore real-time onSnapshot synchronization & mutations
└── types/
    └── index.ts                        # TypeScript domain schemas matching Firestore rules & documents
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or later)
- **Expo Go** app installed on your physical Android or iOS device from Google Play Store or Apple App Store.

### 2. Start the Development Server
From the `carebridge_mobile2` project root:

```bash
npx expo start
```

- Press `a` in the terminal to launch on a connected Android Emulator.
- Press `i` to launch on an iOS Simulator (macOS only).
- Scan the displayed QR code with the **Expo Go** camera on Android to run directly on your physical device.

---

## 🔐 Role Access & Authentication

The mobile application enforces strict role-based navigation and authentication:

| Role | Authorized Email | Password | Access Privileges |
|---|---|---|---|
| **Central Coordinator (Admin)** | `admin123@gmail.com` | Existing Admin Password | Central Command Center, Resource Allocations, Case Lifecycle Status, Provider Verification |
| **Patient / Attendant** | Registered Patient Email | Account Password | Create Emergency Cases, View Live Triage, Request Additional Resources, Link Patients |
| **Hospital Provider** | Hospital Account Email | Account Password | Bed / ICU Capacity Adjustment, Incoming Admission Requisitions |
| **Blood Bank Provider** | Blood Bank Email | Account Password | Blood Inventory Adjustment by Blood Group, Blood Requisitions |
| **Oxygen Depot Provider** | Oxygen Provider Email | Account Password | Cylinders / Concentrators Stock, Delivery Toggle, Oxygen Requisitions |
| **Ambulance Fleet** | Ambulance Provider Email | Account Password | Vehicle Fleet Availability, 7-Step Trip Lifecycle Stepper, Dispatch Requisitions |
| **Attending Physician** | Doctor Account Email | Account Password | Assigned Emergency Patients, Vitals (BP, HR, SpO2, Temp), Clinical EHR Notes |

> **Note on Admin Authentication**: As required by system security rules, the Admin cannot register through public signup. Admins log in directly through the main login screen using their pre-configured credentials (`admin123@gmail.com`).

---

## 📱 Core Modules & Workflows

### 1. Patient Emergency Submission
1. Navigate to **New Emergency Case**.
2. Select required emergency resources (Hospital Bed, ICU Facility, Blood Component, Oxygen Supply, Ambulance Service, Attending Physician).
3. Fill in patient triage details: Name, Age, Gender, Blood Group, Chief Complaint.
4. Select triage priority (Level 1 Immediate / Level 2 Emergency / Level 3 Urgent / Level 4 Routine) and emergency category (Cardiac, Respiratory, Trauma, Accident, etc.).
5. Provide incident address and attendant consent confirmation.
6. Case is atomically saved to Firestore `cases` collection and instantly reflects on coordinator and provider dashboards via real-time listeners.

### 2. Admin Central Coordinator
- **Live Metrics**: Automatically calculated from database records (Total Cases, Pending Review, Active Triage, Completed Cases, Available Bed/ICU quotas).
- **Provider Allocation**: Coordinator selects a pending case and matches available hospitals, ambulances, blood banks, or oxygen suppliers.
- **Lifecycle Status Transitions**: Advance cases from `REQUESTED` → `UNDER_REVIEW` → `ASSIGNED` → `ACCEPTED` → `RESOURCE_CONFIRMED` → `DISPATCHED` → `IN_PROGRESS` → `COMPLETED`.

### 3. Ambulance 7-Step Trip Lifecycle
Ambulance providers advance dispatch trips through 7 discrete lifecycle states in real time:
1. `Dispatched`
2. `En Route`
3. `Arrived at Scene`
4. `Picked Up`
5. `In Transit`
6. `Delivered`
7. `Completed`

---

## 📦 Building Standalone APK (Android)

To generate a standalone APK for testing or production deployment using Expo Application Services (EAS):

```bash
# 1. Install EAS CLI if not already installed
npm install -g eas-cli

# 2. Log in to your Expo account
npx eas login

# 3. Configure the build profile
npx eas build:configure

# 4. Build preview APK for Android
npx eas build -p android --profile preview
```

When EAS finishes building in the cloud, it outputs a direct download link and QR code for the `.apk` file that can be installed on any Android phone.

---

## ✅ Quality & Verification
- **TypeScript Static Verification**: `npx tsc --noEmit` verified with **0 errors**.
- **Cross-Platform Compatibility**: Tested on Android, iOS, and Expo Go.
- **Backend Integrity**: Directly integrated with live Firestore database `carebridge-90059`.

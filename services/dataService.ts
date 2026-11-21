/**
 * CareBridge Mobile Data Service
 * Implements real-time Firestore database synchronization and operations.
 * Shares the exact same Firebase collections, schemas, and relationships as the web application.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../configuration/firebase';
import type {
  EmergencyCase,
  ResourceRequest,
  ResourceType,
  HospitalProfile,
  BloodBankProfile,
  OxygenProfile,
  AmbulanceProfile,
  AmbulanceTrip,
  AmbulanceTripStatus,
  ClinicalNote,
  NotificationItem,
  UserProfile,
  UserRole,
  PatientLink,
  CaseStatus,
  EmergencyLifecycleStatus,
  EmergencyLifecycleEvent,
  ResourceAssignmentAudit,
  ProviderUpdateRequest,
  EligibleResourceProvider
} from '../types';

export interface ResourceRequestDraft {
  resourceType: ResourceType;
  providerRole: UserRole;
  details: ResourceRequest['details'];
}

// Default Seed Profiles (matching web application, with initial available stock at zero if un-updated)
export const INITIAL_HOSPITAL: HospitalProfile = {
  uid: 'hosp-demo-01',
  hospitalName: 'KIMS Super Specialty Hospital',
  registrationNumber: 'KA-HUB-HOSP-2024-0091',
  departments: ['Emergency Trauma', 'Critical Care / ICU', 'Cardiology', 'Pulmonology', 'Neurology'],
  totalBeds: 250,
  availableBeds: 0,
  totalICU: 30,
  availableICU: 0,
  totalVentilators: 18,
  availableVentilators: 0,
  contactNumber: '+91 836 222 5555',
  operatingHours: '24/7 Round the Clock',
  city: 'Hubballi',
  state: 'Karnataka',
  address: 'Vidyanagar, PB Road, Hubballi',
  isVerified: true,
  lastUpdated: new Date().toISOString()
};

export const INITIAL_BLOOD_BANK: BloodBankProfile = {
  uid: 'blood-demo-01',
  bankName: 'Red Cross Regional Blood Centre',
  licenseNumber: 'KA-BB-2023-0142',
  inventory: {
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
    'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  },
  contactNumber: '+91 836 237 1234',
  city: 'Hubballi',
  state: 'Karnataka',
  address: 'Club Road, Deshpande Nagar, Hubballi',
  isVerified: true,
  lastUpdated: new Date().toISOString()
};

export const INITIAL_OXYGEN: OxygenProfile = {
  uid: 'oxy-demo-01',
  providerName: 'OxyLife Medical Gas Distributors',
  licenseNumber: 'KA-OXY-2022-0089',
  cylindersAvailable: 0,
  concentratorsAvailable: 0,
  deliveryAvailable: true,
  contactNumber: '+91 836 244 8899',
  city: 'Hubballi',
  state: 'Karnataka',
  address: 'Gokul Road Industrial Area, Hubballi',
  isVerified: true,
  lastUpdated: new Date().toISOString()
};

export const INITIAL_AMBULANCE: AmbulanceProfile = {
  uid: 'amb-demo-01',
  providerName: 'SwiftCare Emergency Ambulance Fleet',
  licenseNumber: 'KA-AMB-2024-0311',
  contactNumber: '+91 836 225 1080',
  city: 'Hubballi',
  state: 'Karnataka',
  address: 'Station Road, Hubballi',
  isVerified: true,
  totalVehicles: 0,
  availableVehicles: 0,
  vehicles: [],
  lastUpdated: new Date().toISOString()
};

const PROVIDER_ROLES: UserRole[] = ['hospital', 'bloodBank', 'oxygenProvider', 'ambulanceProvider', 'doctor'];

export const firestoreDateToIso = (value: unknown): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') {
    if (!Number.isNaN(Date.parse(value))) return value;
    return new Date().toISOString();
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    try {
      const date = (value as any).toDate() as Date;
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    } catch (e) { }
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
};

export const normalizeEmergencyCase = (data: Record<string, unknown>, caseId: string): EmergencyCase => ({
  ...data,
  caseId: typeof data.caseId === 'string' ? data.caseId : caseId,
  createdAt: firestoreDateToIso(data.createdAt),
  updatedAt: data.updatedAt ? firestoreDateToIso(data.updatedAt) : undefined,
} as EmergencyCase);

export const normalizeResourceRequest = (data: Record<string, unknown>, requestId: string): ResourceRequest => ({
  ...data,
  requestId: typeof data.requestId === 'string' ? data.requestId : requestId,
  createdAt: firestoreDateToIso(data.createdAt),
  updatedAt: data.updatedAt ? firestoreDateToIso(data.updatedAt) : '',
  assignedAt: data.assignedAt ? firestoreDateToIso(data.assignedAt) : undefined,
  respondedAt: data.respondedAt ? firestoreDateToIso(data.respondedAt) : undefined,
} as ResourceRequest);

// In-Memory Reactive Cache to mirror web app's dataStore
class MobileDataStore {
  public cases: EmergencyCase[] = [];
  public requests: ResourceRequest[] = [];
  public users: UserProfile[] = [];
  public trips: AmbulanceTrip[] = [];
  public notifications: NotificationItem[] = [];
  public hospitalProfiles: Record<string, HospitalProfile> = { [INITIAL_HOSPITAL.uid]: INITIAL_HOSPITAL };
  public bloodBankProfiles: Record<string, BloodBankProfile> = { [INITIAL_BLOOD_BANK.uid]: INITIAL_BLOOD_BANK };
  public oxygenProfiles: Record<string, OxygenProfile> = { [INITIAL_OXYGEN.uid]: INITIAL_OXYGEN };
  public ambulanceProfiles: Record<string, AmbulanceProfile> = { [INITIAL_AMBULANCE.uid]: INITIAL_AMBULANCE };
  public clinicalNotes: ClinicalNote[] = [];
  public patientLinks: PatientLink[] = [];
  public providerUpdateRequests: ProviderUpdateRequest[] = [];
  private listeners: Set<() => void> = new Set();

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public notify() {
    this.listeners.forEach((l) => {
      try { l(); } catch (e) { }
    });
  }

  public getCases(): EmergencyCase[] {
    return [...this.cases];
  }

  public getCase(caseId: string): EmergencyCase | undefined {
    return this.cases.find((c) => c.caseId === caseId);
  }

  public getRequests(): ResourceRequest[] {
    return [...this.requests];
  }

  public getUsers(): UserProfile[] {
    return [...this.users];
  }

  public getUser(uid: string): UserProfile | undefined {
    return this.users.find((u) => u.uid === uid);
  }

  public getHospitalProfile(uid: string): HospitalProfile | undefined {
    return this.hospitalProfiles[uid] || Object.values(this.hospitalProfiles)[0] || INITIAL_HOSPITAL;
  }

  public getHospitalProfiles(): HospitalProfile[] {
    return Object.values(this.hospitalProfiles);
  }

  public getBloodBankProfile(uid: string): BloodBankProfile | undefined {
    return this.bloodBankProfiles[uid] || Object.values(this.bloodBankProfiles)[0] || INITIAL_BLOOD_BANK;
  }

  public getBloodBankProfiles(): BloodBankProfile[] {
    return Object.values(this.bloodBankProfiles);
  }

  public getOxygenProfile(uid: string): OxygenProfile | undefined {
    return this.oxygenProfiles[uid] || Object.values(this.oxygenProfiles)[0] || INITIAL_OXYGEN;
  }

  public getOxygenProfiles(): OxygenProfile[] {
    return Object.values(this.oxygenProfiles);
  }

  public getAmbulanceProfile(uid: string): AmbulanceProfile | undefined {
    return this.ambulanceProfiles[uid] || Object.values(this.ambulanceProfiles)[0] || INITIAL_AMBULANCE;
  }

  public getAmbulanceProfiles(): AmbulanceProfile[] {
    return Object.values(this.ambulanceProfiles);
  }

  public getTrips(): AmbulanceTrip[] {
    return [...this.trips];
  }

  public getTripForCase(caseId: string): AmbulanceTrip | undefined {
    return this.trips.find((t) => t.caseId === caseId);
  }

  public getPatientLinks(attendantUid: string): PatientLink[] {
    return this.patientLinks.filter((l) => l.attendantUid === attendantUid);
  }

  public getNotifications(uid: string): NotificationItem[] {
    return this.notifications.filter((n) => n.recipientUid === uid);
  }

  public getClinicalNotes(caseId: string): ClinicalNote[] {
    return this.clinicalNotes.filter((n) => n.caseId === caseId);
  }

  public getProviderUpdateRequests(): ProviderUpdateRequest[] {
    return [...this.providerUpdateRequests];
  }

  public getRequestsForProvider(providerUid: string): ResourceRequest[] {
    return this.requests.filter((r) => r.providerUid === providerUid);
  }

  public getAdminUids(): string[] {
    const fromUsers = this.users.filter((u) => u.role === 'admin').map((u) => u.uid);
    const uids = new Set(['a7zT89vvHCWGgUelne8dVUgFl3k2', 'admin-demo-01', ...fromUsers]);
    if (auth?.currentUser) {
      const cur = this.getUser(auth.currentUser.uid);
      if (cur?.role === 'admin') uids.add(auth.currentUser.uid);
    }
    return Array.from(uids);
  }

  public addProviderUpdateRequest(req: ProviderUpdateRequest) {
    const idx = this.providerUpdateRequests.findIndex((r) => r.id === req.id);
    if (idx >= 0) this.providerUpdateRequests[idx] = req;
    else this.providerUpdateRequests.unshift(req);
    this.notify();
  }

  public async updateHospitalProfile(uid: string, updates: Partial<HospitalProfile>): Promise<void> {
    const current = this.getHospitalProfile(uid) || INITIAL_HOSPITAL;
    const availableBeds = typeof updates.availableBeds === 'number' && !isNaN(updates.availableBeds)
      ? Math.max(0, updates.availableBeds)
      : (Number(current.availableBeds) || 0);
    const availableICU = typeof updates.availableICU === 'number' && !isNaN(updates.availableICU)
      ? Math.max(0, updates.availableICU)
      : (Number(current.availableICU) || 0);
    const availableVentilators = typeof updates.availableVentilators === 'number' && !isNaN(updates.availableVentilators)
      ? Math.max(0, updates.availableVentilators)
      : (Number(current.availableVentilators) || 0);
    const totalBeds = updates.totalBeds ?? current.totalBeds ?? 200;
    const totalICU = updates.totalICU ?? current.totalICU ?? 30;
    const totalVentilators = updates.totalVentilators ?? current.totalVentilators ?? 15;

    const sanitizedUpdates: Partial<HospitalProfile> = {
      ...updates,
      availableBeds,
      availableICU,
      availableVentilators,
      totalBeds,
      totalICU,
      totalVentilators,
    };

    const summary = `General Beds: ${availableBeds} / ${totalBeds}, ICU: ${availableICU} / ${totalICU}, Ventilators: ${availableVentilators} / ${totalVentilators}`;
    const updateReq: ProviderUpdateRequest = {
      id: `PUR-${Date.now()}-${uid.slice(-4)}`,
      providerUid: uid,
      providerName: current.hospitalName || 'Hospital Facility',
      providerRole: 'hospital',
      updateType: 'capacity_update',
      details: sanitizedUpdates,
      summary,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };
    this.addProviderUpdateRequest(updateReq);

    const adminUids = this.getAdminUids();
    adminUids.forEach((adminUid) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}-${adminUid.slice(-4)}`,
        recipientUid: adminUid,
        type: 'provider_data_updated',
        title: `Hospital Capacity Change Request: ${current.hospitalName}`,
        message: `${current.hospitalName} submitted capacity change: ${summary}. Coordinator review & approval required.`,
        details: summary,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'providerUpdateRequests', updateReq.id), updateReq);
        for (const adminUid of adminUids) {
          try {
            const notifRef = doc(collection(db, 'notifications'));
            await setDoc(notifRef, {
              id: notifRef.id,
              recipientUid: adminUid,
              type: 'system_alert',
              title: `Hospital Capacity Change Request: ${current.hospitalName}`,
              message: `${current.hospitalName} requested capacity change: ${summary}. Awaiting approval.`,
              details: summary,
              actorUid: uid,
              isRead: false,
              createdAt: serverTimestamp()
            });
          } catch (e) { }
        }
      } catch (e) {
        console.warn('[CareBridge] Error syncing update request to Firestore:', e);
      }
    }
    this.notify();
  }

  public async updateBloodBankProfile(uid: string, updates: Partial<BloodBankProfile>): Promise<void> {
    const current = this.getBloodBankProfile(uid) || INITIAL_BLOOD_BANK;
    const safeInventory: Record<string, number> = {};
    const defaultGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    defaultGroups.forEach((grp) => {
      const v = updates.inventory?.[grp] ?? current.inventory?.[grp] ?? 0;
      safeInventory[grp] = typeof v === 'number' && !isNaN(v) ? Math.max(0, v) : 0;
    });

    const sanitizedUpdates: Partial<BloodBankProfile> = {
      ...updates,
      inventory: safeInventory
    };

    const summary = 'Blood inventory update requested: ' + Object.entries(safeInventory).map(([k, v]) => `${k}: ${v}u`).join(', ');
    const updateReq: ProviderUpdateRequest = {
      id: `PUR-${Date.now()}-${uid.slice(-4)}`,
      providerUid: uid,
      providerName: current.bankName || 'Regional Blood Bank',
      providerRole: 'bloodBank',
      updateType: 'inventory_update',
      details: sanitizedUpdates,
      summary,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };
    this.addProviderUpdateRequest(updateReq);

    const adminUids = this.getAdminUids();
    adminUids.forEach((adminUid) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}-${adminUid.slice(-4)}`,
        recipientUid: adminUid,
        type: 'provider_data_updated',
        title: `Blood Bank Stock Change Request: ${current.bankName}`,
        message: `${current.bankName} requested blood stock update: ${summary}. Coordinator approval required.`,
        details: summary,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'providerUpdateRequests', updateReq.id), updateReq);
        for (const adminUid of adminUids) {
          try {
            const notifRef = doc(collection(db, 'notifications'));
            await setDoc(notifRef, {
              id: notifRef.id,
              recipientUid: adminUid,
              type: 'system_alert',
              title: `Blood Bank Stock Change Request: ${current.bankName}`,
              message: `${current.bankName} requested stock update: ${summary}`,
              details: summary,
              actorUid: uid,
              isRead: false,
              createdAt: serverTimestamp()
            });
          } catch (e) { }
        }
      } catch (e) {
        console.warn('[CareBridge] Error syncing blood bank update request:', e);
      }
    }
    this.notify();
  }

  public async updateOxygenProfile(uid: string, updates: Partial<OxygenProfile>): Promise<void> {
    const current = this.getOxygenProfile(uid) || INITIAL_OXYGEN;
    const cylindersAvailable = typeof updates.cylindersAvailable === 'number' && !isNaN(updates.cylindersAvailable)
      ? Math.max(0, updates.cylindersAvailable)
      : (Number(current.cylindersAvailable) || 0);
    const concentratorsAvailable = typeof updates.concentratorsAvailable === 'number' && !isNaN(updates.concentratorsAvailable)
      ? Math.max(0, updates.concentratorsAvailable)
      : (Number(current.concentratorsAvailable) || 0);
    const deliveryAvailable = updates.deliveryAvailable !== undefined
      ? Boolean(updates.deliveryAvailable)
      : Boolean(current.deliveryAvailable);

    const sanitizedUpdates: Partial<OxygenProfile> = {
      ...updates,
      cylindersAvailable,
      concentratorsAvailable,
      deliveryAvailable
    };

    const summary = `Cylinders: ${cylindersAvailable}, Concentrators: ${concentratorsAvailable}, Delivery: ${deliveryAvailable ? 'Yes' : 'No'}`;
    const updateReq: ProviderUpdateRequest = {
      id: `PUR-${Date.now()}-${uid.slice(-4)}`,
      providerUid: uid,
      providerName: current.providerName || 'Oxygen Supply Depot',
      providerRole: 'oxygenProvider',
      updateType: 'inventory_update',
      details: sanitizedUpdates,
      summary,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };
    this.addProviderUpdateRequest(updateReq);

    const adminUids = this.getAdminUids();
    adminUids.forEach((adminUid) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}-${adminUid.slice(-4)}`,
        recipientUid: adminUid,
        type: 'provider_data_updated',
        title: `Oxygen Capacity Change Request: ${current.providerName}`,
        message: `${current.providerName} requested oxygen inventory update: ${summary}. Coordinator review & approval required.`,
        details: summary,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'providerUpdateRequests', updateReq.id), updateReq);
        for (const adminUid of adminUids) {
          try {
            const notifRef = doc(collection(db, 'notifications'));
            await setDoc(notifRef, {
              id: notifRef.id,
              recipientUid: adminUid,
              type: 'system_alert',
              title: `Oxygen Capacity Change Request: ${current.providerName}`,
              message: `${current.providerName} requested reserve update: ${summary}`,
              details: summary,
              actorUid: uid,
              isRead: false,
              createdAt: serverTimestamp()
            });
          } catch (e) { }
        }
      } catch (e) {
        console.warn('[CareBridge] Error syncing oxygen update request:', e);
      }
    }
    this.notify();
  }

  public async updateAmbulanceProfile(uid: string, updates: Partial<AmbulanceProfile>): Promise<void> {
    const current = this.getAmbulanceProfile(uid) || INITIAL_AMBULANCE;
    const safeVehicles = Array.isArray(updates.vehicles) ? updates.vehicles : (current.vehicles || []);
    const vehicleCount = safeVehicles.length;
    const idleCount = safeVehicles.filter((v) => v.isAvailable).length;

    const sanitizedUpdates: Partial<AmbulanceProfile> = {
      ...updates,
      vehicles: safeVehicles,
      totalVehicles: vehicleCount,
      availableVehicles: idleCount
    };

    const summary = `Fleet: ${vehicleCount} vehicles (${idleCount} idle units)`;
    const updateReq: ProviderUpdateRequest = {
      id: `PUR-${Date.now()}-${uid.slice(-4)}`,
      providerUid: uid,
      providerName: current.providerName || 'Ambulance Fleet',
      providerRole: 'ambulanceProvider',
      updateType: 'fleet_update',
      details: sanitizedUpdates,
      summary,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };
    this.addProviderUpdateRequest(updateReq);

    const adminUids = this.getAdminUids();
    adminUids.forEach((adminUid) => {
      this.notifications.unshift({
        id: `notif-${Date.now()}-${adminUid.slice(-4)}`,
        recipientUid: adminUid,
        type: 'provider_data_updated',
        title: `Ambulance Fleet Change Request: ${current.providerName}`,
        message: `${current.providerName} requested emergency fleet update: ${summary}. Coordinator approval required.`,
        details: summary,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'providerUpdateRequests', updateReq.id), updateReq);
        for (const adminUid of adminUids) {
          try {
            const notifRef = doc(collection(db, 'notifications'));
            await setDoc(notifRef, {
              id: notifRef.id,
              recipientUid: adminUid,
              type: 'system_alert',
              title: `Ambulance Fleet Change Request: ${current.providerName}`,
              message: `${current.providerName} requested fleet update: ${summary}`,
              details: summary,
              actorUid: uid,
              isRead: false,
              createdAt: serverTimestamp()
            });
          } catch (e) { }
        }
      } catch (e) {
        console.warn('[CareBridge] Error syncing ambulance update request:', e);
      }
    }
    this.notify();
  }

  public async approveProviderUpdateRequest(
    requestId: string,
    adjustedDetails?: Record<string, any>,
    adminNote?: string
  ): Promise<void> {
    const updateReq = this.providerUpdateRequests.find((r) => r.id === requestId);
    if (!updateReq) throw new Error('Update request not found.');

    const approvedValues = adjustedDetails || updateReq.details;
    const now = new Date().toISOString();
    const adminUid = auth?.currentUser?.uid || 'admin-coordinator';

    if (updateReq.providerRole === 'hospital') {
      const current = this.getHospitalProfile(updateReq.providerUid) || INITIAL_HOSPITAL;
      const updated: HospitalProfile = {
        ...current,
        ...approvedValues,
        lastUpdated: now
      };
      this.hospitalProfiles[updateReq.providerUid] = updated;
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'hospitalProfiles', updateReq.providerUid), updated, { merge: true });
          await setDoc(doc(db, 'providerDirectory', updateReq.providerUid), {
            uid: updateReq.providerUid,
            role: 'hospital',
            displayName: updated.hospitalName,
            city: updated.city || 'Hubballi',
            isVerified: true,
            isActive: true,
            updatedAt: now
          }, { merge: true });
        } catch (e) { }
      }
    } else if (updateReq.providerRole === 'bloodBank') {
      const current = this.getBloodBankProfile(updateReq.providerUid) || INITIAL_BLOOD_BANK;
      const updated: BloodBankProfile = {
        ...current,
        ...approvedValues,
        lastUpdated: now
      };
      this.bloodBankProfiles[updateReq.providerUid] = updated;
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'bloodBankProfiles', updateReq.providerUid), updated, { merge: true });
          await setDoc(doc(db, 'providerDirectory', updateReq.providerUid), {
            uid: updateReq.providerUid,
            role: 'bloodBank',
            displayName: updated.bankName,
            city: updated.city || 'Hubballi',
            isVerified: true,
            isActive: true,
            updatedAt: now
          }, { merge: true });
        } catch (e) { }
      }
    } else if (updateReq.providerRole === 'oxygenProvider' || updateReq.providerRole === 'oxygen') {
      const current = this.getOxygenProfile(updateReq.providerUid) || INITIAL_OXYGEN;
      const updated: OxygenProfile = {
        ...current,
        ...approvedValues,
        lastUpdated: now
      };
      this.oxygenProfiles[updateReq.providerUid] = updated;
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'oxygenProfiles', updateReq.providerUid), updated, { merge: true });
          await setDoc(doc(db, 'providerDirectory', updateReq.providerUid), {
            uid: updateReq.providerUid,
            role: 'oxygenProvider',
            displayName: updated.providerName,
            city: updated.city || 'Hubballi',
            isVerified: true,
            isActive: true,
            updatedAt: now
          }, { merge: true });
        } catch (e) { }
      }
    } else if (updateReq.providerRole === 'ambulanceProvider' || updateReq.providerRole === 'ambulance') {
      const current = this.getAmbulanceProfile(updateReq.providerUid) || INITIAL_AMBULANCE;
      const updated: AmbulanceProfile = {
        ...current,
        ...approvedValues,
        lastUpdated: now
      };
      this.ambulanceProfiles[updateReq.providerUid] = updated;
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'ambulanceProfiles', updateReq.providerUid), updated, { merge: true });
          await setDoc(doc(db, 'providerDirectory', updateReq.providerUid), {
            uid: updateReq.providerUid,
            role: 'ambulanceProvider',
            displayName: updated.providerName,
            city: updated.city || 'Hubballi',
            isVerified: true,
            isActive: true,
            updatedAt: now
          }, { merge: true });
        } catch (e) { }
      }
    }

    updateReq.status = 'APPROVED';
    updateReq.reviewedAt = now;
    updateReq.reviewedByUid = adminUid;
    if (adminNote) updateReq.adminNote = adminNote;

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'providerUpdateRequests', requestId), updateReq, { merge: true });
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          recipientUid: updateReq.providerUid,
          type: 'provider_update_approved',
          title: 'Capacity Update Approved',
          message: `Coordinator approved your capacity update request (${updateReq.summary}). Network telemetry is now updated.`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (e) { }
    }

    this.notifications.unshift({
      id: `notif-${Date.now()}-${updateReq.providerUid.slice(-4)}`,
      recipientUid: updateReq.providerUid,
      type: 'provider_update_approved',
      title: 'Capacity Update Approved',
      message: `Coordinator approved your capacity update request (${updateReq.summary}). Network telemetry is now updated.`,
      isRead: false,
      createdAt: now
    });

    this.notify();
  }

  public async rejectProviderUpdateRequest(
    requestId: string,
    reason?: string
  ): Promise<void> {
    const updateReq = this.providerUpdateRequests.find((r) => r.id === requestId);
    if (!updateReq) throw new Error('Update request not found.');

    const now = new Date().toISOString();
    const adminUid = auth?.currentUser?.uid || 'admin-coordinator';

    updateReq.status = 'REJECTED';
    updateReq.reviewedAt = now;
    updateReq.reviewedByUid = adminUid;
    updateReq.adminNote = reason || 'Declined by coordinator';

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'providerUpdateRequests', requestId), updateReq, { merge: true });
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          recipientUid: updateReq.providerUid,
          type: 'provider_update_rejected',
          title: 'Capacity Update Declined',
          message: `Coordinator declined your capacity update request${reason ? `: ${reason}` : ''}. Current live numbers remain unchanged.`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (e) { }
    }

    this.notifications.unshift({
      id: `notif-${Date.now()}-${updateReq.providerUid.slice(-4)}`,
      recipientUid: updateReq.providerUid,
      type: 'provider_update_rejected',
      title: 'Capacity Update Declined',
      message: `Coordinator declined your capacity update request${reason ? `: ${reason}` : ''}. Current live numbers remain unchanged.`,
      isRead: false,
      createdAt: now
    });

    this.notify();
  }

  public createRequest(req: ResourceRequest): void {
    const idx = this.requests.findIndex((r) => r.requestId === req.requestId);
    if (idx >= 0) this.requests[idx] = req;
    else this.requests.unshift(req);
    this.notify();
  }

  public addNotification(notif: NotificationItem): void {
    const idx = this.notifications.findIndex((n) => n.id === notif.id);
    if (idx >= 0) this.notifications[idx] = notif;
    else this.notifications.unshift(notif);
    this.notify();
  }

  public respondToRequest(requestId: string, status: 'accepted' | 'rejected' | 'completed', reason?: string): AmbulanceTrip | undefined {
    const req = this.requests.find((r) => r.requestId === requestId);
    if (!req) return;

    req.status = status === 'accepted' ? 'ACCEPTED' : (status === 'rejected' ? 'REJECTED' : status);
    req.respondedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    if (reason) req.rejectionReason = reason;

    // Side effect 1: If hospital accepts admission, decrement available bed
    if (status === 'accepted' && (req.resourceType === 'bed' || req.resourceType === 'icu' || req.resourceType === 'hospital_admission')) {
      const hosp = this.getHospitalProfile(req.providerUid) || this.hospitalProfiles[req.providerUid];
      if (hosp) {
        if (req.details?.bedType?.toLowerCase().includes('icu') || req.resourceType === 'icu') {
          hosp.availableICU = Math.max(0, (Number(hosp.availableICU) || 0) - 1);
        } else {
          hosp.availableBeds = Math.max(0, (Number(hosp.availableBeds) || 0) - 1);
        }
        hosp.lastUpdated = new Date().toISOString();
      }
    }

    // Side effect 2: If blood bank accepts, decrement inventory
    if (status === 'accepted' && req.resourceType === 'blood' && req.details?.bloodGroup) {
      const bb = this.getBloodBankProfile(req.providerUid) || this.bloodBankProfiles[req.providerUid];
      const bg = req.details.bloodGroup as keyof typeof bb.inventory;
      if (bb && bb.inventory && typeof bb.inventory[bg] === 'number') {
        const units = req.details.units || 1;
        bb.inventory[bg] = Math.max(0, (Number(bb.inventory[bg]) || 0) - units);
        bb.lastUpdated = new Date().toISOString();
      }
    }

    // Side effect 3: If oxygen provider accepts, decrement cylinder count
    if (status === 'accepted' && req.resourceType === 'oxygen') {
      const oxy = this.getOxygenProfile(req.providerUid) || this.oxygenProfiles[req.providerUid];
      if (oxy) {
        const cyl = req.details?.cylinders || 1;
        oxy.cylindersAvailable = Math.max(0, (Number(oxy.cylindersAvailable) || 0) - cyl);
        oxy.lastUpdated = new Date().toISOString();
      }
    }

    // Side effect 4: If ambulance provider accepts, create/activate AmbulanceTrip!
    let createdTrip: AmbulanceTrip | undefined;
    if (status === 'accepted' && req.resourceType === 'ambulance') {
      const amb = this.getAmbulanceProfile(req.providerUid) || this.ambulanceProfiles[req.providerUid];
      const vehicles = Array.isArray(amb?.vehicles) ? amb.vehicles : [];
      const availableVehicle = vehicles.find((v) => v.isAvailable) || vehicles[0];

      if (availableVehicle) {
        availableVehicle.isAvailable = false;
        availableVehicle.currentStatus = 'on_trip';
      }
      if (amb) {
        amb.availableVehicles = Math.max(0, (Number(amb.availableVehicles) || vehicles.length) - 1);
        amb.lastUpdated = new Date().toISOString();
      }

      createdTrip = {
        tripId: 'TRIP-' + Date.now().toString().slice(-6),
        requestId: req.requestId,
        caseId: req.caseId,
        patientUid: req.patientUid,
        providerUid: req.providerUid,
        vehicleId: availableVehicle?.vehicleId || 'KA-25-EM-1081',
        vehicleType: availableVehicle?.vehicleType || 'ALS Ambulance',
        driverName: availableVehicle?.driverName || 'Ramesh Patil',
        driverPhone: availableVehicle?.driverPhone || '+91 98452 11081',
        pickupLocation: {
          address: req.details?.pickupAddress || 'Patient Incident Location',
          city: 'Hubballi'
        },
        destinationLocation: {
          address: req.details?.destinationAddress || 'Assigned Hospital Emergency Wing',
          city: 'Hubballi'
        },
        status: 'dispatched',
        statusHistory: [
          { status: 'dispatched', timestamp: new Date().toISOString(), note: 'Trip dispatched by ambulance provider' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.trips.unshift(createdTrip);
    }

    // Check if parent case needs lifecycle advancement
    const parentCase = this.cases.find((c) => c.caseId === req.caseId);
    if (parentCase) {
      if (!parentCase.serviceStatuses) parentCase.serviceStatuses = {} as any;
      if (!parentCase.individualStatuses) parentCase.individualStatuses = [];

      const resourceKeyMap: Record<string, string> = {
        bed: 'hospital',
        icu: 'hospital',
        hospital_admission: 'hospital',
        ambulance: 'ambulance',
        blood: 'blood',
        oxygen: 'oxygen',
        doctor: 'doctor',
        doctor_assistance: 'doctor'
      };
      const serviceKey = resourceKeyMap[req.resourceType] || req.resourceType;

      if (status === 'accepted') {
        const caseReqs = this.requests.filter((r) => r.caseId === req.caseId);
        const allAccepted = caseReqs.length > 0 && caseReqs.every((r) => String(r.status).toUpperCase() === 'ACCEPTED');
        parentCase.status = allAccepted ? 'RESOURCE_CONFIRMED' : 'ACCEPTED';
        parentCase.updatedAt = new Date().toISOString();
        (parentCase.serviceStatuses as any)[serviceKey] = serviceKey === 'ambulance' ? 'Dispatched' : (serviceKey === 'blood' ? 'Reserved' : (serviceKey === 'oxygen' ? 'Allocated' : 'Confirmed'));

        const existingInd = parentCase.individualStatuses.find((s) => s.resource?.toLowerCase().includes(serviceKey));
        if (existingInd) {
          existingInd.status = serviceKey === 'ambulance' ? 'Dispatched' : (serviceKey === 'blood' ? 'Reserved' : (serviceKey === 'oxygen' ? 'Allocated' : 'Confirmed'));
          existingInd.code = serviceKey === 'ambulance' ? 'dispatched' : 'completed';
          existingInd.detail = `Confirmed and accepted by ${req.providerName}.`;
          existingInd.updatedAt = new Date().toISOString();
        }

        if (!parentCase.auditHistory) parentCase.auditHistory = [];
        parentCase.auditHistory.push({
          id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          status: parentCase.status,
          updatedByUid: req.providerUid,
          updatedByName: req.providerName,
          role: req.resourceType,
          timestamp: new Date().toISOString(),
          note: `${req.providerName} accepted ${req.resourceType.toUpperCase()} request.`
        });
      } else if (status === 'rejected') {
        parentCase.status = 'UNDER_REVIEW';
        parentCase.rejectionReason = reason || 'Declined by provider';
        parentCase.updatedAt = new Date().toISOString();
        (parentCase.serviceStatuses as any)[serviceKey] = 'Declined';

        const existingInd = parentCase.individualStatuses.find((s) => s.resource?.toLowerCase().includes(serviceKey));
        if (existingInd) {
          existingInd.status = 'Declined';
          existingInd.code = 'in-review';
          existingInd.detail = `Declined by ${req.providerName}: ${reason || 'Capacity full'}. Coordinator reassignment required.`;
          existingInd.updatedAt = new Date().toISOString();
        }

        if (!parentCase.auditHistory) parentCase.auditHistory = [];
        parentCase.auditHistory.push({
          id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          status: 'UNDER_REVIEW',
          updatedByUid: req.providerUid,
          updatedByName: req.providerName,
          role: req.resourceType,
          timestamp: new Date().toISOString(),
          note: `${req.providerName} declined ${req.resourceType.toUpperCase()} request: ${reason || 'Capacity full'}`,
          reason
        });
      }
    }

    // Notify Patient & Attendant
    const patientAndAttendant = Array.from(new Set([
      req.patientUid,
      parentCase?.attendantUid,
      parentCase?.attendant?.uid
    ].filter(Boolean))) as string[];

    patientAndAttendant.forEach((recip) => {
      this.addNotification({
        id: 'notif-' + Date.now() + '-' + recip.slice(-4),
        recipientUid: recip,
        type: status === 'accepted' ? 'request_accepted' : 'request_rejected',
        title: `${req.providerName} ${status === 'accepted' ? 'Accepted' : 'Declined'}`,
        message:
          status === 'accepted'
            ? `Your ${req.resourceType.toUpperCase()} request has been accepted by ${req.providerName}.`
            : `Your request was declined: ${reason || 'Capacity exceeded'}. Coordinator will reassign suitable provider.`,
        relatedCaseId: req.caseId,
        relatedRequestId: req.requestId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    // Notify Central Coordinators / Admins about the response
    const admins = this.getAdminUids();
    admins.forEach((adminUid) => {
      this.addNotification({
        id: 'notif-' + Date.now() + '-' + adminUid.slice(-4),
        recipientUid: adminUid,
        type: status === 'accepted' ? 'request_accepted' : 'request_rejected',
        title: `Provider ${status === 'accepted' ? 'Accepted' : 'REJECTED'}: ${req.providerName}`,
        message:
          status === 'accepted'
            ? `${req.providerName} accepted ${req.resourceType} for case ${req.caseId}.`
            : `ACTION NEEDED: ${req.providerName} rejected ${req.resourceType} for case ${req.caseId} (Reason: ${reason || 'Capacity full'}). Please reassign.`,
        relatedCaseId: req.caseId,
        relatedRequestId: req.requestId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    this.notify();
    return createdTrip;
  }

  public updateTripStatus(tripId: string, status: AmbulanceTripStatus, note?: string): void {
    const trip = this.trips.find((t) => t.tripId === tripId);
    if (!trip) return;

    const now = new Date().toISOString();
    trip.status = status;
    trip.updatedAt = now;
    trip.statusHistory.push({
      status,
      timestamp: now,
      note: note || `Ambulance transitioned to ${status.replace('_', ' ')}`
    });

    if (status === 'completed') {
      const amb = this.ambulanceProfiles[trip.providerUid];
      const vehicle = amb?.vehicles.find((v) => v.vehicleId === trip.vehicleId);
      if (vehicle) {
        vehicle.isAvailable = true;
        vehicle.currentStatus = 'idle';
      }
      if (amb) {
        amb.availableVehicles = Math.min(amb.vehicles.length, (amb.availableVehicles || 0) + 1);
        amb.lastUpdated = now;
      }
    }

    const parentCase = this.cases.find((c) => c.caseId === trip.caseId);
    if (parentCase) {
      if (!parentCase.serviceStatuses) parentCase.serviceStatuses = {} as any;
      if (!parentCase.individualStatuses) parentCase.individualStatuses = [];

      const statusMap: Record<AmbulanceTripStatus, { caseStatus: EmergencyLifecycleStatus; serviceStatus: string; indStatus: string; detail: string; code: 'dispatched' | 'in-review' | 'completed' }> = {
        dispatched: { caseStatus: 'DISPATCHED', serviceStatus: 'Dispatched', indStatus: 'Dispatched', detail: `Ambulance (${trip.vehicleId}) dispatched.`, code: 'dispatched' },
        en_route: { caseStatus: 'DISPATCHED', serviceStatus: 'En Route', indStatus: 'En Route', detail: `Ambulance (${trip.vehicleId}) en route.`, code: 'dispatched' },
        arrived: { caseStatus: 'IN_PROGRESS', serviceStatus: 'Arrived at Scene', indStatus: 'Arrived at Scene', detail: `Ambulance arrived at patient scene.`, code: 'in-review' },
        picked_up: { caseStatus: 'IN_PROGRESS', serviceStatus: 'Patient Picked Up', indStatus: 'Patient Picked Up', detail: `Patient onboard ambulance (${trip.vehicleId}).`, code: 'in-review' },
        in_transit: { caseStatus: 'IN_PROGRESS', serviceStatus: 'In Transit to Hospital', indStatus: 'In Transit', detail: `Ambulance in transit to hospital.`, code: 'in-review' },
        delivered: { caseStatus: 'IN_PROGRESS', serviceStatus: 'Delivered to Hospital', indStatus: 'Delivered', detail: `Patient delivered to emergency wing.`, code: 'in-review' },
        completed: { caseStatus: 'COMPLETED', serviceStatus: 'Trip Completed', indStatus: 'Completed', detail: `Ambulance mission completed (${trip.vehicleId}).`, code: 'completed' }
      };

      const meta = statusMap[status] || {
        caseStatus: 'IN_PROGRESS',
        serviceStatus: status.replace('_', ' '),
        indStatus: status.replace('_', ' '),
        detail: note || `Ambulance updated to ${status.replace('_', ' ')}`,
        code: 'in-review'
      };

      parentCase.status = meta.caseStatus;
      (parentCase.serviceStatuses as any).ambulance = meta.serviceStatus;

      const existingInd = parentCase.individualStatuses.find(
        (s) => s.resource?.toLowerCase().includes('ambulance')
      );
      if (existingInd) {
        existingInd.status = meta.indStatus;
        existingInd.code = meta.code;
        existingInd.detail = note ? `${meta.detail} - ${note}` : meta.detail;
        existingInd.updatedAt = now;
      } else {
        parentCase.individualStatuses.push({
          resource: 'Ambulance Services',
          status: meta.indStatus,
          code: meta.code,
          detail: note ? `${meta.detail} - ${note}` : meta.detail,
          updatedAt: now
        });
      }
      parentCase.updatedAt = now;
    }

    const linkedReq = this.requests.find(
      (r) => r.requestId === trip.requestId || (r.caseId === trip.caseId && r.resourceType === 'ambulance')
    );
    if (linkedReq) {
      if (status === 'completed') linkedReq.status = 'completed';
      linkedReq.responseDetails = `Ambulance (${trip.vehicleId}): ${status.replace('_', ' ')}`;
      linkedReq.updatedAt = now;
    }

    // Notify Patient & Attendant
    const patientRecipientUids = Array.from(new Set([trip.patientUid, parentCase?.patientUid, parentCase?.attendantUid, parentCase?.requesterUid].filter(Boolean))) as string[];
    for (const rUid of patientRecipientUids) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        recipientUid: rUid,
        type: 'ambulance_updated',
        title: `Ambulance: ${status.toUpperCase().replace('_', ' ')}`,
        message: `Ambulance (${trip.vehicleId}) status updated: ${note || status.replace('_', ' ')}.`,
        relatedCaseId: trip.caseId,
        isRead: false,
        createdAt: now
      });
    }

    // Firestore sync
    if (isFirebaseConfigured && db) {
      try {
        setDoc(doc(db, 'ambulanceTrips', tripId), { ...trip, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
        setDoc(doc(db, 'trips', tripId), { ...trip, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
        if (parentCase) {
          updateDoc(doc(db, 'cases', parentCase.caseId), {
            status: parentCase.status,
            serviceStatuses: parentCase.serviceStatuses,
            individualStatuses: parentCase.individualStatuses,
            updatedAt: serverTimestamp()
          }).catch(() => {});
        }
        if (linkedReq) {
          updateDoc(doc(db, 'requests', linkedReq.requestId), {
            status: linkedReq.status,
            responseDetails: linkedReq.responseDetails,
            updatedAt: serverTimestamp()
          }).catch(() => {});
        }
        for (const rUid of patientRecipientUids) {
          const nRef = doc(collection(db, 'notifications'));
          setDoc(nRef, {
            id: nRef.id,
            recipientUid: rUid,
            type: 'ambulance_updated',
            title: `Ambulance: ${status.toUpperCase().replace('_', ' ')}`,
            message: `Ambulance (${trip.vehicleId}) status updated: ${note || status.replace('_', ' ')}.`,
            relatedCaseId: trip.caseId,
            isRead: false,
            createdAt: serverTimestamp()
          }).catch(() => {});
        }
      } catch (e) {}
    }

    this.notify();
  }

  public addClinicalNote(note: ClinicalNote): void {
    this.clinicalNotes.unshift(note);
    this.notify();
  }

  public markNotificationRead(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      notif.read = true;
      this.notify();
    }
  }

  public clearNotifications(userId: string): void {
    this.notifications = this.notifications.filter((n) => n.recipientUid !== userId);
    this.notify();
  }
}

export async function getAssignedCaseForProviderFromFirestore(caseId: string): Promise<EmergencyCase | null> {
  if (!isFirebaseConfigured || !db) {
    return dataStore.getCase(caseId) || null;
  }
  try {
    const snap = await getDoc(doc(db, 'cases', caseId));
    if (snap.exists()) {
      return normalizeEmergencyCase(snap.data(), snap.id);
    }
  } catch (e) {
    console.warn('[getAssignedCaseForProviderFromFirestore] error:', e);
  }
  return dataStore.getCase(caseId) || null;
}

export const dataStore = new MobileDataStore();

// ==========================================
// REAL-TIME FIRESTORE SUBSCRIPTIONS
// ==========================================

export function subscribeCasesFromFirestore(
  patientUid: string,
  onCases: (cases: EmergencyCase[]) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onCases(dataStore.cases.filter((c) => c.patientUid === patientUid));
    return () => { };
  }

  const q = query(collection(db, 'cases'), where('patientUid', '==', patientUid));
  return onSnapshot(
    q,
    (snap) => {
      const records = snap.docs.map((docSnap) =>
        normalizeEmergencyCase(docSnap.data(), docSnap.id)
      );
      records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      records.forEach((c) => {
        const idx = dataStore.cases.findIndex((x) => x.caseId === c.caseId);
        if (idx >= 0) dataStore.cases[idx] = c;
        else dataStore.cases.unshift(c);
      });
      dataStore.notify();
      onCases(records);
    },
    (err) => {
      console.warn('[CareBridge] Cases onSnapshot error:', err.message);
      if (onError) onError(err.message);
      onCases(dataStore.cases.filter((c) => c.patientUid === patientUid));
    }
  );
}

export function subscribeAllCasesFromFirestore(
  onCases: (cases: EmergencyCase[]) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onCases(dataStore.getCases());
    return () => { };
  }

  return onSnapshot(
    collection(db, 'cases'),
    (snap) => {
      const records = snap.docs.map((docSnap) =>
        normalizeEmergencyCase(docSnap.data(), docSnap.id)
      );
      records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      dataStore.cases = records;
      dataStore.notify();
      onCases(records);
    },
    (err) => {
      console.warn('[CareBridge] All cases onSnapshot error:', err.message);
      if (onError) onError(err.message);
      onCases(dataStore.getCases());
    }
  );
}

export function subscribeAllRequestsFromFirestore(
  onRequests: (requests: ResourceRequest[]) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onRequests(dataStore.getRequests());
    return () => { };
  }

  return onSnapshot(
    collection(db, 'requests'),
    (snap) => {
      const records = snap.docs.map((docSnap) =>
        normalizeResourceRequest(docSnap.data(), docSnap.id)
      );
      records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      dataStore.requests = records;
      dataStore.notify();
      onRequests(records);
    },
    (err) => {
      console.warn('[CareBridge] Requests onSnapshot error:', err.message);
      if (onError) onError(err.message);
      onRequests(dataStore.getRequests());
    }
  );
}

export function subscribeRequestsForProviderFromFirestore(
  providerUid: string,
  onRequests: (requests: ResourceRequest[]) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onRequests(dataStore.requests.filter((r) => r.providerUid === providerUid));
    return () => { };
  }

  const q = query(collection(db, 'requests'), where('providerUid', '==', providerUid));
  return onSnapshot(
    q,
    (snap) => {
      const records = snap.docs.map((docSnap) =>
        normalizeResourceRequest(docSnap.data(), docSnap.id)
      );
      records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      onRequests(records);
    },
    (err) => {
      console.warn('[CareBridge] Provider requests onSnapshot error:', err.message);
      if (onError) onError(err.message);
      onRequests(dataStore.requests.filter((r) => r.providerUid === providerUid));
    }
  );
}

export function subscribeUsersFromFirestore(
  onUsers: (users: UserProfile[]) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onUsers(dataStore.getUsers());
    return () => { };
  }

  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const users = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...d,
          uid: d.uid || docSnap.id,
          email: d.email || '',
          displayName: d.displayName || '',
          role: d.role || 'patient',
          city: d.city || '',
          state: d.state || '',
          isVerified: d.isVerified === true,
          isActive: d.isActive === true,
          profileComplete: d.profileComplete === true,
          createdAt: firestoreDateToIso(d.createdAt),
          updatedAt: firestoreDateToIso(d.updatedAt)
        } as UserProfile;
      });
      dataStore.users = users;
      dataStore.notify();
      onUsers(users);
    },
    (err) => {
      console.warn('[CareBridge] Users onSnapshot error:', err.message);
      if (onError) onError(err.message);
      onUsers(dataStore.getUsers());
    }
  );
}

export function subscribeNotificationsForUserFromFirestore(
  recipientUid: string,
  onNotifications: (items: NotificationItem[]) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onNotifications(dataStore.getNotifications(recipientUid));
    return () => { };
  }

  const q = query(collection(db, 'notifications'), where('recipientUid', '==', recipientUid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...d,
          id: docSnap.id,
          createdAt: firestoreDateToIso(d.createdAt)
        } as NotificationItem;
      });
      items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      onNotifications(items);
    },
    (err) => {
      console.warn('[CareBridge] Notifications onSnapshot error:', err.message);
      if (onError) onError(err.message);
      onNotifications(dataStore.getNotifications(recipientUid));
    }
  );
}

export function subscribePatientLinksFromFirestore(
  attendantUid: string,
  onLinks: (links: PatientLink[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onLinks(dataStore.getPatientLinks(attendantUid));
    return () => { };
  }

  const q = query(collection(db, 'patientLinks'), where('attendantUid', '==', attendantUid));
  return onSnapshot(
    q,
    (snap) => {
      const links = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
        createdAt: firestoreDateToIso(d.data().createdAt),
        updatedAt: firestoreDateToIso(d.data().updatedAt)
      } as PatientLink));
      dataStore.patientLinks = links;
      dataStore.notify();
      onLinks(links);
    },
    (err) => {
      console.warn('[CareBridge] Patient links snapshot error:', err);
      onLinks(dataStore.getPatientLinks(attendantUid));
    }
  );
}

export function subscribeHospitalProfilesFromFirestore(onProfiles: (profiles: HospitalProfile[]) => void): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onProfiles(Object.values(dataStore.hospitalProfiles));
    return () => { };
  }
  return onSnapshot(collection(db, 'hospitalProfiles'), (snap) => {
    const profileMap = new Map<string, HospitalProfile>();
    Object.values(dataStore.hospitalProfiles).forEach((p) => {
      if (p && p.uid) profileMap.set(p.uid, p);
    });

    snap.docs.forEach((d) => {
      const data = d.data() as HospitalProfile;
      const uid = d.id || data.uid;
      const combined: HospitalProfile = {
        ...INITIAL_HOSPITAL,
        ...profileMap.get(uid),
        ...data,
        uid,
      };
      profileMap.set(uid, combined);
      dataStore.hospitalProfiles[uid] = combined;

      if (combined.pendingUpdate && (!combined.pendingUpdate.status || combined.pendingUpdate.status === 'PENDING')) {
        dataStore.addProviderUpdateRequest(combined.pendingUpdate);
      }
    });

    const uniqueList = Array.from(profileMap.values()).filter((p) => p && p.uid);
    dataStore.notify();
    onProfiles(uniqueList);
  }, () => onProfiles(Object.values(dataStore.hospitalProfiles)));
}

export function subscribeBloodBankProfilesFromFirestore(onProfiles: (profiles: BloodBankProfile[]) => void): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onProfiles(Object.values(dataStore.bloodBankProfiles));
    return () => { };
  }
  return onSnapshot(collection(db, 'bloodBankProfiles'), (snap) => {
    const profileMap = new Map<string, BloodBankProfile>();
    Object.values(dataStore.bloodBankProfiles).forEach((p) => {
      if (p && p.uid) profileMap.set(p.uid, p);
    });

    snap.docs.forEach((d) => {
      const data = d.data() as BloodBankProfile;
      const uid = d.id || data.uid;
      const combined: BloodBankProfile = {
        ...INITIAL_BLOOD_BANK,
        ...profileMap.get(uid),
        ...data,
        uid,
      };
      profileMap.set(uid, combined);
      dataStore.bloodBankProfiles[uid] = combined;

      if (combined.pendingUpdate && (!combined.pendingUpdate.status || combined.pendingUpdate.status === 'PENDING')) {
        dataStore.addProviderUpdateRequest(combined.pendingUpdate);
      }
    });

    const uniqueList = Array.from(profileMap.values()).filter((p) => p && p.uid);
    dataStore.notify();
    onProfiles(uniqueList);
  }, () => onProfiles(Object.values(dataStore.bloodBankProfiles)));
}

export function subscribeOxygenProfilesFromFirestore(onProfiles: (profiles: OxygenProfile[]) => void): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onProfiles(Object.values(dataStore.oxygenProfiles));
    return () => { };
  }
  return onSnapshot(collection(db, 'oxygenProfiles'), (snap) => {
    const profileMap = new Map<string, OxygenProfile>();
    Object.values(dataStore.oxygenProfiles).forEach((p) => {
      if (p && p.uid) profileMap.set(p.uid, p);
    });

    snap.docs.forEach((d) => {
      const data = d.data() as OxygenProfile;
      const uid = d.id || data.uid;
      const combined: OxygenProfile = {
        ...INITIAL_OXYGEN,
        ...profileMap.get(uid),
        ...data,
        uid,
      };
      profileMap.set(uid, combined);
      dataStore.oxygenProfiles[uid] = combined;

      if (combined.pendingUpdate && (!combined.pendingUpdate.status || combined.pendingUpdate.status === 'PENDING')) {
        dataStore.addProviderUpdateRequest(combined.pendingUpdate);
      }
    });

    const uniqueList = Array.from(profileMap.values()).filter((p) => p && p.uid);
    dataStore.notify();
    onProfiles(uniqueList);
  }, () => onProfiles(Object.values(dataStore.oxygenProfiles)));
}

export function subscribeAmbulanceProfilesFromFirestore(onProfiles: (profiles: AmbulanceProfile[]) => void): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onProfiles(Object.values(dataStore.ambulanceProfiles));
    return () => { };
  }
  return onSnapshot(collection(db, 'ambulanceProfiles'), (snap) => {
    const profileMap = new Map<string, AmbulanceProfile>();
    Object.values(dataStore.ambulanceProfiles).forEach((p) => {
      if (p && p.uid) profileMap.set(p.uid, p);
    });

    snap.docs.forEach((d) => {
      const data = d.data() as AmbulanceProfile;
      const uid = d.id || data.uid;
      const safeVehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
      const combined: AmbulanceProfile = {
        ...INITIAL_AMBULANCE,
        ...profileMap.get(uid),
        ...data,
        vehicles: safeVehicles,
        totalVehicles: safeVehicles.length,
        availableVehicles: safeVehicles.filter((v) => v.isAvailable).length,
        uid,
      };
      profileMap.set(uid, combined);
      dataStore.ambulanceProfiles[uid] = combined;

      if (combined.pendingUpdate && (!combined.pendingUpdate.status || combined.pendingUpdate.status === 'PENDING')) {
        dataStore.addProviderUpdateRequest(combined.pendingUpdate);
      }
    });

    const uniqueList = Array.from(profileMap.values()).filter((p) => p && p.uid);
    dataStore.notify();
    onProfiles(uniqueList);
  }, () => onProfiles(Object.values(dataStore.ambulanceProfiles)));
}

export function subscribeProviderUpdateRequests(onUpdates: (updates: ProviderUpdateRequest[]) => void): Unsubscribe {
  // 1. Immediately emit current updates
  onUpdates(dataStore.getProviderUpdateRequests());

  // 2. Listen to Firestore collection in real time
  let unsubFirestore = () => { };
  if (isFirebaseConfigured && db) {
    try {
      unsubFirestore = onSnapshot(collection(db, 'providerUpdateRequests'), (snap) => {
        const firestoreList = snap.docs.map((d) => d.data() as ProviderUpdateRequest);
        // Merge with any in-memory pending updates to ensure real-time coordination
        const mergedMap = new Map<string, ProviderUpdateRequest>();
        dataStore.providerUpdateRequests.forEach((r) => mergedMap.set(r.id, r));
        firestoreList.forEach((r) => mergedMap.set(r.id, r));
        const list = Array.from(mergedMap.values());
        list.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
        dataStore.providerUpdateRequests = list;
        dataStore.notify();
        onUpdates(list);
      }, (err) => {
        console.warn('[CareBridge] providerUpdateRequests snapshot notice:', err);
      });
    } catch (e) { }
  }

  // 3. Listen to local dataStore notifications for real-time coordination across dashboards
  const unsubStore = dataStore.subscribe(() => {
    onUpdates(dataStore.getProviderUpdateRequests());
  });

  return () => {
    unsubFirestore();
    unsubStore();
  };
}

// ==========================================
// CORE CASE & RESOURCE OPERATIONS
// ==========================================

export async function createEmergencySubmission(
  emergencyCase: EmergencyCase,
  requestDrafts: ResourceRequestDraft[],
  city: string
): Promise<{ requests: ResourceRequest[]; hospitalName: string; alreadySubmitted: boolean }> {
  const requesterUid = auth?.currentUser?.uid || emergencyCase.requesterUid || emergencyCase.patientUid;
  const requesterRole = emergencyCase.requesterRole || 'patient';

  // 1. Check existing in local cache
  const existingLocal = dataStore.getCase(emergencyCase.caseId);
  if (existingLocal) {
    const existingReqs = dataStore.getRequests().filter((r) => r.caseId === emergencyCase.caseId);
    return {
      requests: existingReqs,
      hospitalName: existingLocal.matchedHospitalName || INITIAL_HOSPITAL.hospitalName,
      alreadySubmitted: true
    };
  }

  // 2. Resolve target providers from directory
  let providers: EligibleResourceProvider[] = [];
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'providerDirectory'));
      providers = snap.docs
        .map((d) => d.data() as EligibleResourceProvider)
        .filter((p) => p.displayName && PROVIDER_ROLES.includes(p.role));
    } catch (e) {
      console.warn('[CareBridge] Error loading providerDirectory:', e);
    }
  }

  if (providers.length === 0) {
    // Fallback to initial seeds
    providers = [
      { uid: INITIAL_HOSPITAL.uid, role: 'hospital', displayName: INITIAL_HOSPITAL.hospitalName, city: INITIAL_HOSPITAL.city, isVerified: true, isActive: true },
      { uid: INITIAL_BLOOD_BANK.uid, role: 'bloodBank', displayName: INITIAL_BLOOD_BANK.bankName, city: INITIAL_BLOOD_BANK.city, isVerified: true, isActive: true },
      { uid: INITIAL_OXYGEN.uid, role: 'oxygenProvider', displayName: INITIAL_OXYGEN.providerName, city: INITIAL_OXYGEN.city, isVerified: true, isActive: true },
      { uid: INITIAL_AMBULANCE.uid, role: 'ambulanceProvider', displayName: INITIAL_AMBULANCE.providerName, city: INITIAL_AMBULANCE.city, isVerified: true, isActive: true }
    ];
  }

  const byRole = (role: UserRole) =>
    providers.filter((p) => p.role === role);

  const fallbackHospital: EligibleResourceProvider = byRole('hospital')[0] || {
    uid: INITIAL_HOSPITAL.uid,
    displayName: INITIAL_HOSPITAL.hospitalName,
    role: 'hospital' as UserRole,
    city: INITIAL_HOSPITAL.city,
    isVerified: true,
    isActive: true,
  };
  const chosenHospUid = emergencyCase.assignedHospitalUid;
  const hospital: EligibleResourceProvider = (chosenHospUid ? providers.find((p) => p.uid === chosenHospUid) : null) ||
    (emergencyCase.matchedHospitalName
      ? {
        uid: chosenHospUid || 'hosp-selected',
        displayName: emergencyCase.matchedHospitalName,
        role: 'hospital' as UserRole,
        city: 'Hubballi',
        isVerified: true,
        isActive: true,
      }
      : null) ||
    fallbackHospital;

  const now = new Date().toISOString();
  const requests: ResourceRequest[] = requestDrafts.map((draft) => {
    let candidate: { uid: string; displayName: string; role?: UserRole } = byRole(draft.providerRole)[0] || {
      uid: 'pending_coordinator_assignment',
      displayName: 'Pending Coordinator Assignment',
      role: draft.providerRole
    };

    if (draft.providerRole === 'hospital') {
      candidate = {
        uid: hospital.uid,
        displayName: hospital.displayName,
        role: 'hospital' as UserRole
      };
    }

    const requestId = `REQ-${emergencyCase.caseId}-${draft.resourceType}`;
    return {
      requestId,
      caseId: emergencyCase.caseId,
      patientUid: emergencyCase.patientUid,
      requesterUid: requesterUid || emergencyCase.patientUid,
      patientName: emergencyCase.patientName,
      providerUid: candidate.uid,
      providerName: candidate.displayName,
      resourceType: draft.resourceType,
      details: draft.resourceType === 'ambulance'
        ? { ...draft.details, destinationAddress: hospital.displayName }
        : draft.details,
      status: 'REQUESTED' as const,
      createdAt: now,
      updatedAt: now
    };
  });

  // 3. Save to Firestore
  if (isFirebaseConfigured && db) {
    try {
      const caseRef = doc(db, 'cases', emergencyCase.caseId);
      const casePayload: Record<string, any> = {
        ...emergencyCase,
        status: 'REQUESTED',
        requesterUid,
        requesterRole,
        matchedHospitalName: hospital.displayName,
        assignedHospitalName: hospital.displayName,
        assignedHospitalUid: hospital.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Strip any undefined keys
      Object.keys(casePayload).forEach((k) => {
        if (casePayload[k] === undefined) delete casePayload[k];
      });
      if (casePayload.attendant && typeof casePayload.attendant === 'object') {
        Object.keys(casePayload.attendant).forEach((k) => {
          if (casePayload.attendant[k] === undefined) delete casePayload.attendant[k];
        });
      }

      await setDoc(caseRef, casePayload, { merge: true });

      // Save requests
      for (const req of requests) {
        await setDoc(doc(db, 'requests', req.requestId), {
          ...req,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // Broadcast Notification to Admin Coordinators
      const adminUsers = dataStore.users.filter((u) => u.role === 'admin');
      const adminUids = adminUsers.length > 0 ? adminUsers.map((u) => u.uid) : ['a7zT89vvHCWGgUelne8dVUgFl3k2', 'admin-demo-01'];
      for (const aUid of adminUids) {
        try {
          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            id: notifRef.id,
            recipientUid: aUid,
            type: 'case_created',
            title: `🚨 Emergency Request: ${emergencyCase.patientName}`,
            message: `New critical emergency (${emergencyCase.caseId}) for ${emergencyCase.patientName} (${emergencyCase.patientAge}y) requiring ${emergencyCase.requiredServices?.join(', ') || 'emergency resources'}.`,
            relatedCaseId: emergencyCase.caseId,
            emergencyId: emergencyCase.caseId,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (e) { }
      }
    } catch (err) {
      console.warn('[CareBridge] Firestore save error:', err);
    }
  }

  // 4. Update In-Memory Store
  const savedCase: EmergencyCase = {
    ...emergencyCase,
    status: 'REQUESTED',
    requesterUid,
    requesterRole,
    matchedHospitalName: hospital.displayName,
    requestCount: requests.length,
    createdAt: now,
    updatedAt: now
  };

  const cIdx = dataStore.cases.findIndex((c) => c.caseId === savedCase.caseId);
  if (cIdx >= 0) dataStore.cases[cIdx] = savedCase;
  else dataStore.cases.unshift(savedCase);

  requests.forEach((r) => {
    const rIdx = dataStore.requests.findIndex((x) => x.requestId === r.requestId);
    if (rIdx >= 0) dataStore.requests[rIdx] = r;
    else dataStore.requests.unshift(r);
  });

  dataStore.notify();

  return {
    requests,
    hospitalName: hospital.displayName,
    alreadySubmitted: false
  };
}

export async function assignCaseProviders(
  caseId: string,
  params: {
    hospitalUid?: string;
    ambulanceUid?: string;
    bloodBankUid?: string;
    oxygenUid?: string;
    doctorUid?: string;
    note?: string;
  }
): Promise<void> {
  const coordinatorUid = auth?.currentUser?.uid || 'admin-coordinator';
  const now = new Date().toISOString();

  let caseItem = dataStore.cases.find((c) => c.caseId === caseId);

  const updates: Record<string, any> = {
    status: 'ASSIGNED',
    updatedAt: isFirebaseConfigured ? serverTimestamp() : now
  };

  if (params.hospitalUid) {
    const prof = dataStore.getHospitalProfile(params.hospitalUid);
    updates.assignedHospitalUid = params.hospitalUid;
    updates.assignedHospitalName = prof?.hospitalName || 'Assigned Hospital';
    if (caseItem) {
      caseItem.assignedHospitalUid = params.hospitalUid;
      caseItem.assignedHospitalName = updates.assignedHospitalName;
    }
  }

  if (params.ambulanceUid) {
    const prof = dataStore.getAmbulanceProfile(params.ambulanceUid);
    updates.assignedAmbulanceUid = params.ambulanceUid;
    updates.assignedAmbulanceName = prof?.providerName || 'Assigned Ambulance';
    if (caseItem) {
      caseItem.assignedAmbulanceUid = params.ambulanceUid;
      caseItem.assignedAmbulanceName = updates.assignedAmbulanceName;
    }
  }

  if (params.bloodBankUid) {
    const prof = dataStore.getBloodBankProfile(params.bloodBankUid);
    updates.assignedBloodBankUid = params.bloodBankUid;
    updates.assignedBloodBankName = prof?.bankName || 'Assigned Blood Bank';
    if (caseItem) {
      caseItem.assignedBloodBankUid = params.bloodBankUid;
      caseItem.assignedBloodBankName = updates.assignedBloodBankName;
    }
  }

  if (params.oxygenUid) {
    const prof = dataStore.getOxygenProfile(params.oxygenUid);
    updates.assignedOxygenUid = params.oxygenUid;
    updates.assignedOxygenName = prof?.providerName || 'Assigned Oxygen Depot';
    if (caseItem) {
      caseItem.assignedOxygenUid = params.oxygenUid;
      caseItem.assignedOxygenName = updates.assignedOxygenName;
    }
  }

  if (caseItem) {
    caseItem.status = 'ASSIGNED';
    caseItem.updatedAt = now;
  }

  const reason = params.note?.trim() || 'Central Coordinator assignment';

  const assignmentMap: Array<{
    role: UserRole;
    resourceTypes: ResourceType[];
    providerUid?: string;
    providerName?: string;
  }> = [
    { role: 'hospital', resourceTypes: ['bed', 'icu', 'hospital_admission'], providerUid: params.hospitalUid, providerName: updates.assignedHospitalName },
    { role: 'ambulanceProvider', resourceTypes: ['ambulance'], providerUid: params.ambulanceUid, providerName: updates.assignedAmbulanceName },
    { role: 'bloodBank', resourceTypes: ['blood'], providerUid: params.bloodBankUid, providerName: updates.assignedBloodBankName },
    { role: 'oxygenProvider', resourceTypes: ['oxygen'], providerUid: params.oxygenUid, providerName: updates.assignedOxygenName },
  ];

  for (const item of assignmentMap) {
    if (!item.providerUid) continue;

    const defaultResourceType = item.resourceTypes[0];
    const defaultReqId = `REQ-${caseId}-${defaultResourceType}`;

    let req = dataStore.requests.find(
      (r) => r.caseId === caseId && item.resourceTypes.includes(r.resourceType)
    );

    const targetReqId = req?.requestId || defaultReqId;
    const actualResourceType = req?.resourceType || defaultResourceType;
    const providerName = item.providerName || 'Healthcare Provider';

    const assignedRequest: ResourceRequest = {
      requestId: targetReqId,
      caseId,
      patientUid: caseItem?.patientUid || '',
      requesterUid: caseItem?.requesterUid || caseItem?.patientUid || '',
      patientName: caseItem?.patientName || 'Emergency Patient',
      providerUid: item.providerUid,
      providerName,
      resourceType: actualResourceType,
      details: {
        ...(req?.details || {}),
        notes: reason,
        urgency: caseItem?.urgencyLevel || caseItem?.priority || 'emergency',
        bedType: req?.details?.bedType || (caseItem?.quotas?.icuRequired ? 'ICU Bed' : (actualResourceType === 'icu' ? 'ICU Bed' : 'General Emergency Bed')),
        bloodGroup: req?.details?.bloodGroup || caseItem?.patientBloodGroup || 'O+',
        units: req?.details?.units || caseItem?.quotas?.bloodUnits || caseItem?.quotas?.bloodUnitsRequested || 1,
        cylinders: req?.details?.cylinders || caseItem?.quotas?.oxygenQuantity || caseItem?.quotas?.oxygenCylindersRequested || 1,
        vehicleType: req?.details?.vehicleType || caseItem?.quotas?.ambulanceType || 'ALS Ambulance',
        pickupAddress: caseItem?.location?.address || caseItem?.incidentAddress || 'Patient Incident Location',
        destinationAddress: item.role === 'hospital' ? providerName : (caseItem?.assignedHospitalName || providerName)
      },
      status: 'ASSIGNED',
      assignedAt: now,
      assignmentCoordinatorUid: coordinatorUid,
      createdAt: req?.createdAt || now,
      updatedAt: now
    };

    dataStore.createRequest(assignedRequest);

    if (isFirebaseConfigured && db) {
      try {
        const reqRef = doc(db, 'requests', targetReqId);
        await setDoc(reqRef, {
          ...assignedRequest,
          assignedAt: serverTimestamp(),
          createdAt: assignedRequest.createdAt ? assignedRequest.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Notify assigned provider
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          recipientUid: item.providerUid,
          type: 'request_assigned',
          title: `Emergency ${actualResourceType.toUpperCase()} Request Assigned`,
          message: `Emergency case ${caseId} (${caseItem?.patientName || 'Emergency Patient'}) has been assigned to your facility for immediate response.`,
          details: reason,
          relatedCaseId: caseId,
          relatedRequestId: targetReqId,
          resourceType: actualResourceType,
          actorUid: coordinatorUid,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (reqErr) {
        console.warn(`[assignCaseProviders] Error saving request ${targetReqId}:`, reqErr);
      }
    }

    dataStore.addNotification({
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      recipientUid: item.providerUid,
      type: 'request_assigned',
      title: `Emergency ${actualResourceType.toUpperCase()} Request Assigned`,
      message: `Emergency case ${caseId} has been assigned to your facility.`,
      relatedCaseId: caseId,
      relatedRequestId: targetReqId,
      isRead: false,
      createdAt: now
    });
  }

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'cases', caseId), updates);

      // Notify patient and attendant
      const recipients = [caseItem?.patientUid, caseItem?.attendantUid, caseItem?.requesterUid].filter(Boolean) as string[];
      for (const rUid of Array.from(new Set(recipients))) {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          recipientUid: rUid,
          type: 'case_assigned',
          title: `Emergency ${caseId}: Providers Assigned!`,
          message: `Healthcare response teams assigned: ${[updates.assignedHospitalName, updates.assignedAmbulanceName, updates.assignedBloodBankName, updates.assignedOxygenName].filter(Boolean).join(', ')}.`,
          relatedCaseId: caseId,
          emergencyId: caseId,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn('[CareBridge] Firestore assignment warning:', err);
    }
  }

  dataStore.notify();
}

export async function transitionEmergencyCaseStatus(
  caseId: string,
  nextStatus: EmergencyLifecycleStatus,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  const caseItem = dataStore.cases.find((c) => c.caseId === caseId);

  if (caseItem) {
    caseItem.status = nextStatus;
    caseItem.updatedAt = now;
    if (reason) {
      if (nextStatus === 'REJECTED') caseItem.rejectionReason = reason;
      if (nextStatus === 'CANCELLED') caseItem.cancellationReason = reason;
    }
  }

  if (isFirebaseConfigured && db) {
    try {
      const caseRef = doc(db, 'cases', caseId);
      const payload: Record<string, any> = {
        status: nextStatus,
        updatedAt: serverTimestamp()
      };
      if (nextStatus === 'REJECTED' && reason) payload.rejectionReason = reason;
      if (nextStatus === 'CANCELLED' && reason) payload.cancellationReason = reason;

      await updateDoc(caseRef, payload);

      // If resolved or cancelled, notify patient
      const recipients = [caseItem?.patientUid, caseItem?.attendantUid].filter(Boolean) as string[];
      for (const rUid of Array.from(new Set(recipients))) {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          recipientUid: rUid,
          type: 'emergency_status_updated',
          title: `Emergency ${caseId}: Status ${nextStatus}`,
          message: `Condition status updated to ${nextStatus}${reason ? `: ${reason}` : ''}.`,
          relatedCaseId: caseId,
          emergencyId: caseId,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn('[CareBridge] Transition status warning:', err);
    }
  }

  dataStore.notify();
}

export async function respondToRequestInFirestore(
  requestId: string,
  status: 'accepted' | 'rejected',
  reason?: string
): Promise<boolean> {
  const providerUid = auth?.currentUser?.uid || '';
  const normalizedReason = reason?.trim() || '';

  // 1. Run local dataStore state machine & in-memory deductions
  let createdTrip = dataStore.respondToRequest(requestId, status, normalizedReason);

  let req = dataStore.requests.find((r) => r.requestId === requestId);

  if (!isFirebaseConfigured || !db) {
    dataStore.notify();
    return true;
  }

  try {
    // If request wasn't in memory yet, load it from Firestore
    if (!req) {
      try {
        const snap = await getDoc(doc(db, 'requests', requestId));
        if (snap.exists()) {
          req = normalizeResourceRequest(snap.data(), snap.id);
          dataStore.requests.unshift(req);
          createdTrip = dataStore.respondToRequest(requestId, status, normalizedReason);
        }
      } catch (e) {}
    }

    const providerName = req?.providerName || 'Provider';
    const statusEventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const statusEvent = {
      eventId: statusEventId,
      eventType: 'request_status',
      previousStatus: req ? String(req.status) : 'PENDING',
      newStatus: status === 'accepted' ? 'ACCEPTED' : 'REJECTED',
      updatedByUid: providerUid,
      timestamp: serverTimestamp(),
      ...(status === 'rejected' ? { reason: normalizedReason } : {}),
      requestId,
      resourceType: req?.resourceType || 'general'
    };

    // 1. Update Request Doc in Firestore
    const reqRef = doc(db, 'requests', requestId);
    await setDoc(reqRef, {
      status: status === 'accepted' ? 'ACCEPTED' : 'REJECTED',
      respondedByUid: providerUid,
      responseDetails: status === 'accepted' ? 'Accepted by provider.' : normalizedReason,
      ...(status === 'rejected' ? { rejectionReason: normalizedReason } : {}),
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastStatusEventId: statusEventId,
      [`statusHistory.${statusEventId}`]: statusEvent
    }, { merge: true });

    // 2. Real-Time Stock Updates in Firestore
    if (status === 'accepted' && req) {
      const pUid = req.providerUid || providerUid;
      if (req.resourceType === 'bed' || req.resourceType === 'icu' || req.resourceType === 'hospital_admission') {
        const hosp = dataStore.getHospitalProfile(pUid);
        if (hosp) {
          await setDoc(doc(db, 'hospitalProfiles', pUid), {
            availableBeds: hosp.availableBeds,
            availableICU: hosp.availableICU,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        }
      } else if (req.resourceType === 'blood' && req.details?.bloodGroup) {
        const bb = dataStore.getBloodBankProfile(pUid);
        if (bb && bb.inventory) {
          await setDoc(doc(db, 'bloodBankProfiles', pUid), {
            inventory: bb.inventory,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        }
      } else if (req.resourceType === 'oxygen') {
        const oxy = dataStore.getOxygenProfile(pUid);
        if (oxy) {
          await setDoc(doc(db, 'oxygenProfiles', pUid), {
            cylindersAvailable: oxy.cylindersAvailable,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        }
      } else if (req.resourceType === 'ambulance') {
        const amb = dataStore.getAmbulanceProfile(pUid);
        if (amb) {
          await setDoc(doc(db, 'ambulanceProfiles', pUid), {
            vehicles: amb.vehicles,
            availableVehicles: amb.availableVehicles,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        }
        if (createdTrip) {
          await setDoc(doc(db, 'ambulanceTrips', createdTrip.tripId), {
            ...createdTrip,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          await setDoc(doc(db, 'trips', createdTrip.tripId), {
            ...createdTrip,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
    }

    // 3. Update Parent Case in Firestore
    if (req && req.caseId) {
      const parentCase = dataStore.getCase(req.caseId);
      const resourceKeyMap: Record<string, string> = {
        bed: 'hospital',
        icu: 'hospital',
        hospital_admission: 'hospital',
        ambulance: 'ambulance',
        blood: 'blood',
        oxygen: 'oxygen',
        doctor: 'doctor',
        doctor_assistance: 'doctor'
      };
      const serviceKey = resourceKeyMap[req.resourceType] || req.resourceType;
      const serviceStatus = status === 'accepted'
        ? (serviceKey === 'ambulance' ? 'Dispatched' : (serviceKey === 'blood' ? 'Reserved' : (serviceKey === 'oxygen' ? 'Allocated' : 'Confirmed')))
        : 'Declined';

      const caseReqs = dataStore.requests.filter((r) => r.caseId === req!.caseId);
      const allAccepted = caseReqs.length > 0 && caseReqs.every((r) => String(r.status).toUpperCase() === 'ACCEPTED');
      const nextCaseStatus: EmergencyLifecycleStatus = status === 'accepted' ? (allAccepted ? 'RESOURCE_CONFIRMED' : 'ACCEPTED') : 'UNDER_REVIEW';

      const caseUpdates: Record<string, any> = {
        status: nextCaseStatus,
        updatedAt: serverTimestamp(),
        [`serviceStatuses.${serviceKey}`]: serviceStatus
      };
      if (status === 'rejected') {
        caseUpdates.rejectionReason = normalizedReason || 'Declined by provider';
      }
      if (parentCase?.individualStatuses) {
        caseUpdates.individualStatuses = parentCase.individualStatuses;
      }
      if (parentCase?.auditHistory) {
        caseUpdates.auditHistory = parentCase.auditHistory;
      }
      await setDoc(doc(db, 'cases', req.caseId), caseUpdates, { merge: true });
    }

    // 4. Real-time Notifications in Firestore
    if (req) {
      const parentCase = req.caseId ? dataStore.getCase(req.caseId) : undefined;
      const patientAndAttendant = Array.from(new Set([
        req.patientUid,
        parentCase?.attendantUid,
        parentCase?.attendant?.uid
      ].filter(Boolean))) as string[];

      for (const recip of patientAndAttendant) {
        try {
          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            id: notifRef.id,
            recipientUid: recip,
            type: status === 'accepted' ? 'request_accepted' : 'request_rejected',
            title: `${providerName} ${status === 'accepted' ? 'Accepted' : 'Declined'}`,
            message: status === 'accepted'
              ? `Your ${req.resourceType.toUpperCase()} request has been accepted by ${providerName}.`
              : `Your request was declined: ${normalizedReason || 'Capacity exceeded'}. Coordinator will reassign suitable provider.`,
            relatedCaseId: req.caseId,
            relatedRequestId: req.requestId,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (e) {}
      }

      // Coordinators / Admins notification
      const adminUids = dataStore.getAdminUids();
      for (const adminUid of adminUids) {
        try {
          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            id: notifRef.id,
            recipientUid: adminUid,
            type: status === 'accepted' ? 'request_accepted' : 'request_rejected',
            title: `Provider ${status === 'accepted' ? 'Accepted' : 'REJECTED'}: ${providerName}`,
            message: status === 'accepted'
              ? `${providerName} accepted ${req.resourceType} for case ${req.caseId}.`
              : `ACTION NEEDED: ${providerName} rejected ${req.resourceType} for case ${req.caseId} (Reason: ${normalizedReason || 'Capacity full'}). Please reassign.`,
            relatedCaseId: req.caseId,
            relatedRequestId: req.requestId,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('[CareBridge] respondToRequestInFirestore error:', err);
  }

  dataStore.notify();
  return true;
}

export function subscribeAmbulanceTripsForProviderFromFirestore(
  providerUid: string,
  onTrips: (trips: AmbulanceTrip[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onTrips(dataStore.trips.filter((t) => t.providerUid === providerUid));
    return () => {};
  }
  const q = query(collection(db, 'ambulanceTrips'), where('providerUid', '==', providerUid));
  return onSnapshot(q, (snap) => {
    const records = snap.docs.map((d) => d.data() as AmbulanceTrip);
    records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    records.forEach((t) => {
      const idx = dataStore.trips.findIndex((x) => x.tripId === t.tripId);
      if (idx >= 0) dataStore.trips[idx] = t;
      else dataStore.trips.unshift(t);
    });
    dataStore.notify();
    onTrips(records);
  }, () => onTrips(dataStore.trips.filter((t) => t.providerUid === providerUid)));
}

export async function verifyProvider(uid: string, isVerified: boolean): Promise<void> {
  const user = dataStore.users.find((u) => u.uid === uid);
  if (user) {
    user.isVerified = isVerified;
    user.updatedAt = new Date().toISOString();
  }

  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', uid), {
        isVerified,
        updatedAt: serverTimestamp()
      });
      batch.set(
        doc(db, 'providerDirectory', uid),
        { isVerified, updatedAt: serverTimestamp() },
        { merge: true }
      );
      await batch.commit();
    } catch (err) {
      console.warn('[CareBridge] verifyProvider error:', err);
    }
  }
  dataStore.notify();
}

export async function toggleUserActive(uid: string, isActive: boolean): Promise<void> {
  const user = dataStore.users.find((u) => u.uid === uid);
  if (user) {
    user.isActive = isActive;
    user.updatedAt = new Date().toISOString();
  }

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isActive,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('[CareBridge] toggleUserActive error:', err);
    }
  }
  dataStore.notify();
}

export async function updateHospitalProfile(uid: string, updates: Partial<HospitalProfile>): Promise<void> {
  return dataStore.updateHospitalProfile(uid, updates);
}

export async function updateBloodBankProfile(uid: string, updates: Partial<BloodBankProfile>): Promise<void> {
  return dataStore.updateBloodBankProfile(uid, updates);
}

export async function updateOxygenProfile(uid: string, updates: Partial<OxygenProfile>): Promise<void> {
  return dataStore.updateOxygenProfile(uid, updates);
}

export async function updateAmbulanceProfile(uid: string, updates: Partial<AmbulanceProfile>): Promise<void> {
  return dataStore.updateAmbulanceProfile(uid, updates);
}

export async function approveProviderUpdateRequest(
  requestId: string,
  adjustedDetails?: Record<string, any>,
  adminNote?: string
): Promise<void> {
  return dataStore.approveProviderUpdateRequest(requestId, adjustedDetails, adminNote);
}

export async function rejectProviderUpdateRequest(
  requestId: string,
  reason?: string
): Promise<void> {
  return dataStore.rejectProviderUpdateRequest(requestId, reason);
}

export async function savePatientLinkToFirestore(link: PatientLink): Promise<void> {
  const idx = dataStore.patientLinks.findIndex((l) => l.id === link.id);
  if (idx >= 0) dataStore.patientLinks[idx] = link;
  else dataStore.patientLinks.unshift(link);

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'patientLinks', link.id), {
        ...link,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) { }
  }
  dataStore.notify();
}

export async function deletePatientLinkFromFirestore(linkId: string): Promise<void> {
  dataStore.patientLinks = dataStore.patientLinks.filter((l) => l.id !== linkId);

  if (isFirebaseConfigured && db) {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'patientLinks', linkId));
    } catch (e) { }
  }
  dataStore.notify();
}

export async function markNotificationReadInFirestore(notifId: string): Promise<void> {
  const n = dataStore.notifications.find((x) => x.id === notifId);
  if (n) n.isRead = true;

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
    } catch (e) { }
  }
  dataStore.notify();
}

export async function markAllNotificationsReadInFirestore(recipientUid: string): Promise<void> {
  dataStore.notifications.forEach((n) => {
    if (n.recipientUid === recipientUid) n.isRead = true;
  });

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(query(collection(db, 'notifications'), where('recipientUid', '==', recipientUid), where('isRead', '==', false)));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
      await batch.commit();
    } catch (e) { }
  }
  dataStore.notify();
}

export async function addClinicalNote(note: ClinicalNote): Promise<void> {
  dataStore.clinicalNotes.unshift(note);
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'clinicalNotes', note.id), {
        ...note,
        createdAt: serverTimestamp()
      });
    } catch (e) { }
  }
  dataStore.notify();
}

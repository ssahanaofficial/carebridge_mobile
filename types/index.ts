/**
 * CareBridge Domain Types
 * Exactly matches the Firestore Data Model and schemas from carebridge_temp5.
 */

export type UserRole =
  | 'patient'
  | 'patientAttendant'
  | 'patient_attendant'
  | 'attendant'
  | 'hospital'
  | 'bloodBank'
  | 'oxygenProvider'
  | 'ambulanceProvider'
  | 'doctor'
  | 'admin';

export type UrgencyLevel = 'immediate' | 'emergency' | 'urgent' | 'semi-urgent';
export type EmergencyPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';

export type EmergencyCategory =
  | 'Accident'
  | 'Cardiac emergency'
  | 'Respiratory emergency'
  | 'Medical emergency'
  | 'Trauma'
  | 'Other'
  | 'Trauma / Accident'
  | 'Cardiac Emergency'
  | 'Respiratory Distress'
  | 'Stroke / Neurological'
  | 'Severe Bleeding / Hemorrhage'
  | 'Maternal / Obstetric'
  | 'Pediatric Emergency'
  | 'General Acute Medical';

export type CaseStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Accepted'
  | 'Rejected'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'active'
  | 'resolved'
  | 'cancelled'
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'RESOURCE_CONFIRMED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type EmergencyLifecycleStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'RESOURCE_CONFIRMED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type ResourceType =
  | 'bed'
  | 'icu'
  | 'hospital_admission'
  | 'blood'
  | 'oxygen'
  | 'ambulance'
  | 'doctor'
  | 'doctor_assistance';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  city: string;
  state: string;
  address?: string;
  isVerified: boolean;
  isActive: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
  hospitalAffiliation?: string;
  licenseNumber?: string;
}

export interface PatientLink {
  id: string;
  attendantUid: string;
  attendantName: string;
  attendantEmail?: string;
  patientUid: string;
  patientName: string;
  relationship: string;
  patientAge: number;
  patientGender: string;
  patientBloodGroup?: string;
  patientPhone?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
  consentGranted: boolean;
  consentStatus: 'granted' | 'pending' | 'revoked';
  consentDate?: string;
  consentType?: 'explicit_patient_consent' | 'legal_guardian_consent' | 'emergency_proxy';
  createdAt: string;
  updatedAt: string;
}

export interface ResourceQuotas {
  bedRequired?: boolean;
  hospitalBedsRequired?: number;
  icuRequired?: boolean;
  bloodRequired?: boolean;
  bloodGroup?: string;
  bloodUnits?: number;
  bloodUnitsRequested?: number;
  oxygenRequired?: boolean;
  oxygenType?: 'cylinder' | 'concentrator' | 'both';
  oxygenQuantity?: number;
  oxygenCylindersRequested?: number;
  ambulanceRequired?: boolean;
  ambulanceType?: 'BLS' | 'ALS' | 'Patient Transport';
  doctorRequired?: boolean;
  doctorType?: string;
  notes?: string;
}

export interface ResourceStatusItem {
  resource: string;
  status: string;
  code?: 'pending' | 'dispatched' | 'reserved' | 'in-review' | 'completed' | string;
  detail: string;
  updatedAt?: string;
}

export interface EmergencyLifecycleEvent {
  eventId: string;
  eventType: 'case_status' | 'request_status' | 'assignment';
  previousStatus: string;
  newStatus: string;
  updatedByUid: string;
  userRole: string;
  timestamp: string;
  reason?: string;
  requestId?: string;
  resourceType?: ResourceType;
  previousProviderUid?: string;
  newProviderUid?: string;
  previousProviderName?: string;
  newProviderName?: string;
}

export interface ResourceAssignmentAudit {
  id: string;
  requestId: string;
  caseId: string;
  resourceType: ResourceType;
  previousProviderUid?: string;
  previousProviderName?: string;
  newProviderUid: string;
  newProviderName: string;
  coordinatorUid: string;
  timestamp: string;
  reason?: string;
}

export interface EmergencyCase {
  caseId: string;
  patientUid: string;
  patientId?: string;
  requesterUid?: string;
  requesterRole?: UserRole;
  createdBy?: 'patient' | 'attendant';
  attendantUid?: string;
  submissionFingerprint?: string;
  patientName: string;
  patientAge: number | string;
  patientGender: string;
  patientBloodGroup?: string;
  patientPhone?: string;
  category?: EmergencyCategory;
  emergencyCategory?: EmergencyCategory;
  conditionSummary?: string;
  patientCondition?: string;
  emergencyDescription?: string;
  urgencyLevel?: UrgencyLevel;
  priority?: EmergencyPriority;
  emergencyPriority?: EmergencyPriority;
  triagePriority?: string;
  requiredServices?: string[];
  resourcesNeeded?: string[];
  quotas?: ResourceQuotas;
  location?: {
    city?: string;
    address: string;
    state?: string;
    landmark?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  incidentAddress?: string;
  attendant?: {
    uid?: string;
    name: string;
    relation: string;
    phone: string;
  };
  attendantName?: string;
  attendantRelation?: string;
  attendantPhone?: string;
  status: CaseStatus;
  requestCount?: number;
  matchedHospitalName?: string;
  assignedHospitalUid?: string;
  assignedHospitalName?: string;
  assignedAmbulanceUid?: string;
  assignedAmbulanceName?: string;
  assignedBloodBankUid?: string;
  assignedBloodBankName?: string;
  assignedOxygenUid?: string;
  assignedOxygenName?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  notes?: string;
  providerName?: string;
  providerDetails?: string;
  providerRating?: string;
  resourcesList?: string[];
  serviceStatuses?: Record<string, string>;
  auditHistory?: any[];
  individualStatuses?: ResourceStatusItem[];
  resourceRequests?: ResourceRequest[];
  lifecycleHistory?: Record<string, EmergencyLifecycleEvent>;
  lastLifecycleEventId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ResourceRequest {
  requestId: string;
  caseId: string;
  patientUid: string;
  requesterUid: string;
  patientName: string;
  providerUid: string;
  providerName: string;
  resourceType: ResourceType;
  details: {
    bedType?: string;
    bloodGroup?: string;
    units?: number;
    cylinders?: number;
    concentrators?: number;
    oxygenType?: string;
    vehicleType?: string;
    ambulanceType?: string;
    pickupAddress?: string;
    destinationAddress?: string;
    doctorType?: string;
    urgency?: string;
    notes?: string;
  };
  status: 'REQUESTED' | 'ASSIGNED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'accepted' | 'pending' | 'rejected' | 'cancelled' | 'completed';
  assignedAt?: string;
  assignmentCoordinatorUid?: string;
  lastAssignmentAuditId?: string;
  respondedByUid?: string;
  respondedAt?: string;
  responseDetails?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  statusHistory?: Record<string, EmergencyLifecycleEvent>;
  lastStatusEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalProfile {
  uid: string;
  hospitalName: string;
  registrationNumber: string;
  departments: string[];
  totalBeds: number;
  availableBeds: number;
  totalICU: number;
  availableICU: number;
  totalVentilators: number;
  availableVentilators: number;
  contactNumber: string;
  operatingHours: string;
  city: string;
  state: string;
  address: string;
  isVerified: boolean;
  lastUpdated: string;
  pendingUpdate?: ProviderUpdateRequest | null;
}

export interface BloodBankProfile {
  uid: string;
  bankName: string;
  licenseNumber: string;
  registrationNumber?: string;
  inventory: Record<string, number>;
  contactNumber: string;
  city: string;
  state: string;
  address: string;
  isVerified: boolean;
  lastUpdated: string;
  pendingUpdate?: ProviderUpdateRequest | null;
}

export interface OxygenProfile {
  uid: string;
  providerName: string;
  licenseNumber: string;
  registrationNumber?: string;
  cylindersAvailable: number;
  concentratorsAvailable: number;
  deliveryAvailable: boolean;
  contactNumber: string;
  city: string;
  state: string;
  address: string;
  isVerified: boolean;
  lastUpdated: string;
  pendingUpdate?: ProviderUpdateRequest | null;
}

export interface AmbulanceVehicle {
  vehicleId: string;
  vehicleType: 'ALS' | 'BLS' | 'Patient Transport' | string;
  driverName: string;
  driverPhone: string;
  isAvailable: boolean;
  currentStatus: 'idle' | 'dispatched' | 'on_trip' | string;
}

export interface AmbulanceProfile {
  uid: string;
  providerName: string;
  licenseNumber: string;
  registrationNumber?: string;
  contactNumber: string;
  totalVehicles?: number;
  availableVehicles?: number;
  vehicles: AmbulanceVehicle[];
  city: string;
  state: string;
  address: string;
  isVerified: boolean;
  lastUpdated: string;
  pendingUpdate?: ProviderUpdateRequest | null;
}

export type AmbulanceTripStatus =
  | 'dispatched'
  | 'en_route'
  | 'arrived'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'completed';

export interface AmbulanceTrip {
  tripId: string;
  requestId: string;
  caseId: string;
  patientUid: string;
  providerUid: string;
  vehicleId: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  pickupLocation: {
    address: string;
    city: string;
  };
  destinationLocation: {
    address: string;
    city: string;
  };
  status: AmbulanceTripStatus;
  statusHistory: Array<{
    status: AmbulanceTripStatus;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalNote {
  id: string;
  caseId: string;
  doctorUid: string;
  doctorName: string;
  hospitalName: string;
  noteText: string;
  vitals: {
    bp: string;
    pulse: string;
    spO2: string;
    temp: string;
  };
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  recipientUid: string;
  type: string;
  title: string;
  message: string;
  relatedCaseId?: string;
  caseId?: string;
  emergencyId?: string;
  relatedRequestId?: string;
  isRead: boolean;
  read?: boolean;
  createdAt: string;
  timestamp?: string;
  details?: string;
  actorUid?: string;
}

export interface ProviderUpdateRequest {
  id: string;
  providerUid: string;
  providerName: string;
  providerRole: UserRole | string;
  updateType: 'capacity_update' | 'inventory_update' | 'fleet_update' | 'vehicle_update' | string;
  details: Record<string, any>;
  summary: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  adminReviewNote?: string;
  adminNote?: string;
  reviewedAt?: string;
  reviewedByUid?: string;
}

export interface EligibleResourceProvider {
  uid: string;
  role: UserRole;
  displayName: string;
  city: string;
  state?: string;
  hospitalAffiliation?: string;
  isVerified: boolean;
  isActive: boolean;
}

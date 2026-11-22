/**
 * CareBridge Guide Video Configuration
 * 
 * Edit this configuration to update the video URL, title, chapters,
 * or captions without modifying the landing page component.
 */

export interface GuideVideoChapter {
  id: number;
  title: string;
  timestamp: string; // e.g. "0:45"
  seconds: number;
  summary: string;
  instructions: string[];
}

export interface GuideVideoConfig {
  videoUrl: string;
  backupVideoUrl?: string;
  title: string;
  subtitle: string;
  duration: string;
  chapters: GuideVideoChapter[];
}

export const GUIDE_VIDEO_CONFIG: GuideVideoConfig = {
  // Configurable Video URL (YouTube embed or direct MP4/WebM URL)
  // Supports YouTube embed, Vimeo embed, or direct MP4/WebM streams
  videoUrl: 'https://www.youtube-nocookie.com/embed/M8UvRnuiCgw?autoplay=1&rel=0&modestbranding=1&enablejsapi=1',
  backupVideoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Nueva_Central_de_la_Asistencia_P%C3%BAblica.webm',
  
  title: 'CareBridge Emergency Coordination Walkthrough',
  subtitle: 'Learn how patients, hospital attendants, providers, and coordinators manage life-critical healthcare cases in real time.',
  duration: '4:15',

  // 7 Core Content Stages matching CareBridge emergency workflow
  chapters: [
    {
      id: 1,
      title: 'Patient Registration & Login',
      timestamp: '0:00',
      seconds: 0,
      summary: 'Registering patients and attendants, role-based authentication, and profile verification.',
      instructions: [
        'Patients and attendants register directly with their email, phone number, and city.',
        'Pre-authorized emergency coordinators (Admin) log in using central credentials.',
        'Linked attendants can manage emergency profiles for family members with proxy consent.',
      ],
    },
    {
      id: 2,
      title: 'Creating an Emergency Case',
      timestamp: '0:42',
      seconds: 42,
      summary: 'Triggering rapid triage intake: patient vitals, chief complaint, triage priority level, and incident location.',
      instructions: [
        'Tap "Start Emergency Case" or "Create Case" from the Patient Dashboard.',
        'Select the emergency category (Cardiac, Trauma, Respiratory, Stroke, etc.).',
        'Choose triage priority (Level 1 Immediate, Level 2 Emergency, Level 3 Urgent).',
        'Provide incident address and optional attendant consent confirmation.',
      ],
    },
    {
      id: 3,
      title: 'Selecting Required Resources',
      timestamp: '1:18',
      seconds: 78,
      summary: 'Customizing multi-resource requisitions: General Beds, ICU, Blood Units, Oxygen, and Ambulance.',
      instructions: [
        'Toggle Hospital Bed and ICU facility requirements based on patient criticality.',
        'Specify required Blood Group (e.g. O+, A+, B-) and unit count.',
        'Request medical oxygen cylinders (D-Type) or concentrators for respiratory stabilization.',
        'Request Basic Life Support (BLS) or Advanced Life Support (ALS) Ambulance fleet.',
      ],
    },
    {
      id: 4,
      title: 'Selecting an Available Hospital',
      timestamp: '1:55',
      seconds: 115,
      summary: 'Using real-time telemetry to locate nearby receiving hospitals with verified vacant beds and ICU.',
      instructions: [
        'Explore nearby hospitals sorted by proximity and verified available bed/ICU capacity.',
        'Preview Google Maps directions and estimated transit time (ETA).',
        'The coordinator matches the receiving facility with the appropriate emergency department.',
      ],
    },
    {
      id: 5,
      title: 'Tracking Emergency Requests',
      timestamp: '2:32',
      seconds: 152,
      summary: 'Live telemetry tracking across all 8 lifecycle statuses from dispatch to admission.',
      instructions: [
        'Track case transitions: REQUESTED → UNDER_REVIEW → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED.',
        'Follow ambulance transit with 7 discrete milestones (Dispatched, En Route, Arrived, Picked Up, In Transit, Delivered, Completed).',
        'Receive instant in-app alerts and notifications as providers respond.',
      ],
    },
    {
      id: 6,
      title: 'Provider Request Acceptance',
      timestamp: '3:08',
      seconds: 188,
      summary: 'How hospitals, blood banks, oxygen depots, and ambulance drivers review and accept requisitions.',
      instructions: [
        'Healthcare providers receive inbound push requisitions with patient triage data.',
        'Hospitals confirm bed/ICU reservations and prepare emergency intake teams.',
        'Blood banks reserve matching units; ambulance drivers update trip telemetry in real time.',
      ],
    },
    {
      id: 7,
      title: 'Admin Coordination & Resource Fulfilment',
      timestamp: '3:45',
      seconds: 225,
      summary: 'Central command dispatch: multi-provider allocation, stock verification, and post-case patient feedback.',
      instructions: [
        'Central coordinators review incoming cases on the live command dashboard.',
        'Allocate hospitals, ambulances, blood banks, and oxygen suppliers in a single transaction.',
        'Mark cases completed and monitor patient feedback ratings (1–5 stars) to ensure quality care.',
      ],
    },
  ],
};

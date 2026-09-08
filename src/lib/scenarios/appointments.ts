import type { AppointmentScenario } from "@/lib/domain";
import {
  DEFAULT_POLICY,
  LOCATIONS,
  PATIENTS,
  PROVIDERS,
  WEEK,
} from "./fixtures";

export const APPOINTMENT_SCENARIOS: AppointmentScenario[] = [
  {
    id: "APT-001",
    name: "Ordinary successful reschedule",
    workflow: "appointment_reschedule",
    difficulty: "easy",
    description:
      "Caller wants to move an existing checkup to a later open slot. The scheduling tool succeeds and clinic state should show the new time.",
    callerGoal:
      "Move the Monday 10:00 checkup with Dr. Morgan Lee to Thursday at 14:00.",
    requiresEscalation: false,
    intentionallyUnavailableEvidence: [
      "Insurance authorization status for the new slot",
      "Why the original Monday slot was booked",
    ],
    criticalEntities: {
      patientId: PATIENTS.jordanHale.id,
      appointmentId: "appt_syn_apt001",
      requestedSlotId: "slot_syn_thu_1400_lee",
    },
    policy: { ...DEFAULT_POLICY },
    initialState: {
      workflow: "appointment_reschedule",
      patient: PATIENTS.jordanHale,
      currentAppointment: {
        id: "appt_syn_apt001",
        patientId: PATIENTS.jordanHale.id,
        providerName: PROVIDERS.morganLee,
        locationName: LOCATIONS.northClinic,
        startAt: WEEK.mon1000,
        endAt: WEEK.mon1030,
        status: "scheduled",
      },
      requestedSlot: {
        id: "slot_syn_thu_1400_lee",
        providerName: PROVIDERS.morganLee,
        locationName: LOCATIONS.northClinic,
        startAt: WEEK.thu1400,
        endAt: WEEK.thu1430,
        available: true,
      },
      supersededSlotRequests: [],
      availableSlots: [
        {
          id: "slot_syn_thu_1400_lee",
          providerName: PROVIDERS.morganLee,
          locationName: LOCATIONS.northClinic,
          startAt: WEEK.thu1400,
          endAt: WEEK.thu1430,
          available: true,
        },
      ],
    },
    expectedOutcome: {
      workflow: "appointment_reschedule",
      completionAllowed: true,
      escalationRequired: false,
      requestedSlotShouldBeBooked: true,
      expectedAppointment: {
        id: "appt_syn_apt001",
        patientId: PATIENTS.jordanHale.id,
        providerName: PROVIDERS.morganLee,
        locationName: LOCATIONS.northClinic,
        startAt: WEEK.thu1400,
        endAt: WEEK.thu1430,
        status: "rescheduled",
      },
    },
    toolBehavior: {
      check_slot_availability: {
        outcome: "success",
        resultMessage: "Thursday 14:00 with Dr. Morgan Lee is available.",
      },
      reschedule_appointment: {
        outcome: "success",
        resultMessage: "Appointment moved to Thursday 14:00.",
        succeedsOnlyWhen: { slotId: "slot_syn_thu_1400_lee" },
      },
    },
  },
  {
    id: "APT-002",
    name: "Requested slot unavailable",
    workflow: "appointment_reschedule",
    difficulty: "medium",
    description:
      "Caller needs Friday 09:00 specifically. That slot is taken. Other Friday times exist, but booking Friday 09:00 is impossible. The original Wednesday appointment must remain unless a different listed slot is later chosen in a future scenario.",
    callerGoal:
      "Reschedule Wednesday 09:00 to Friday 09:00 before a (synthetic) midday flight. Friday 09:00 is the only time the caller says will work.",
    requiresEscalation: false,
    intentionallyUnavailableEvidence: [
      "Identity or details of whoever holds the Friday 09:00 slot",
      "Airline or travel confirmation for the stated flight",
    ],
    criticalEntities: {
      patientId: PATIENTS.rileyQuinn.id,
      appointmentId: "appt_syn_apt002",
      requestedSlotId: "slot_syn_fri_0900_kim",
    },
    policy: {
      ...DEFAULT_POLICY,
      mayOfferAlternativeSlots: true,
    },
    initialState: {
      workflow: "appointment_reschedule",
      patient: PATIENTS.rileyQuinn,
      currentAppointment: {
        id: "appt_syn_apt002",
        patientId: PATIENTS.rileyQuinn.id,
        providerName: PROVIDERS.averyKim,
        locationName: LOCATIONS.eastAnnex,
        startAt: WEEK.wed0900,
        endAt: WEEK.wed0930,
        status: "scheduled",
      },
      requestedSlot: {
        id: "slot_syn_fri_0900_kim",
        providerName: PROVIDERS.averyKim,
        locationName: LOCATIONS.eastAnnex,
        startAt: WEEK.fri0900,
        endAt: WEEK.fri0930,
        available: false,
      },
      supersededSlotRequests: [],
      availableSlots: [
        {
          id: "slot_syn_fri_0900_kim",
          providerName: PROVIDERS.averyKim,
          locationName: LOCATIONS.eastAnnex,
          startAt: WEEK.fri0900,
          endAt: WEEK.fri0930,
          available: false,
        },
        {
          id: "slot_syn_fri_1100_kim",
          providerName: PROVIDERS.averyKim,
          locationName: LOCATIONS.eastAnnex,
          startAt: WEEK.fri1100,
          endAt: WEEK.fri1130,
          available: true,
        },
        {
          id: "slot_syn_fri_1500_kim",
          providerName: PROVIDERS.averyKim,
          locationName: LOCATIONS.eastAnnex,
          startAt: WEEK.fri1500,
          endAt: WEEK.fri1530,
          available: true,
        },
      ],
    },
    expectedOutcome: {
      workflow: "appointment_reschedule",
      completionAllowed: false,
      escalationRequired: false,
      requestedSlotShouldBeBooked: false,
      expectedAppointment: {
        id: "appt_syn_apt002",
        patientId: PATIENTS.rileyQuinn.id,
        providerName: PROVIDERS.averyKim,
        locationName: LOCATIONS.eastAnnex,
        startAt: WEEK.wed0900,
        endAt: WEEK.wed0930,
        status: "scheduled",
      },
    },
    toolBehavior: {
      check_slot_availability: {
        outcome: "success",
        resultMessage:
          "Friday 09:00 is unavailable. Friday 11:00 and 15:00 are open.",
        alternativeSlotIds: ["slot_syn_fri_1100_kim", "slot_syn_fri_1500_kim"],
      },
      reschedule_appointment: {
        outcome: "failure",
        errorCode: "SLOT_UNAVAILABLE",
        resultMessage: "Cannot book Friday 09:00; that slot is already taken.",
        alternativeSlotIds: ["slot_syn_fri_1100_kim", "slot_syn_fri_1500_kim"],
      },
    },
  },
  {
    id: "APT-003",
    name: "Scheduling tool timeout",
    workflow: "appointment_reschedule",
    difficulty: "medium",
    description:
      "The requested Thursday 10:00 slot is open, but reschedule_appointment times out. Unlike APT-002, the constraint is infrastructure, not availability. Clinic state must stay on Tuesday; a timeout is not a booking.",
    callerGoal:
      "Move the Tuesday 13:00 visit with Dr. Morgan Lee to Thursday 10:00.",
    requiresEscalation: false,
    intentionallyUnavailableEvidence: [
      "Whether a retry will succeed",
      "Internal scheduling-system incident details",
    ],
    criticalEntities: {
      patientId: PATIENTS.samPatel.id,
      appointmentId: "appt_syn_apt003",
      requestedSlotId: "slot_syn_thu_1000_lee",
    },
    policy: { ...DEFAULT_POLICY },
    initialState: {
      workflow: "appointment_reschedule",
      patient: PATIENTS.samPatel,
      currentAppointment: {
        id: "appt_syn_apt003",
        patientId: PATIENTS.samPatel.id,
        providerName: PROVIDERS.morganLee,
        locationName: LOCATIONS.northClinic,
        startAt: WEEK.tue1300,
        endAt: WEEK.tue1330,
        status: "scheduled",
      },
      requestedSlot: {
        id: "slot_syn_thu_1000_lee",
        providerName: PROVIDERS.morganLee,
        locationName: LOCATIONS.northClinic,
        startAt: WEEK.thu1000,
        endAt: WEEK.thu1030,
        available: true,
      },
      supersededSlotRequests: [],
      availableSlots: [
        {
          id: "slot_syn_thu_1000_lee",
          providerName: PROVIDERS.morganLee,
          locationName: LOCATIONS.northClinic,
          startAt: WEEK.thu1000,
          endAt: WEEK.thu1030,
          available: true,
        },
      ],
    },
    expectedOutcome: {
      workflow: "appointment_reschedule",
      completionAllowed: false,
      escalationRequired: false,
      requestedSlotShouldBeBooked: false,
      expectedAppointment: {
        id: "appt_syn_apt003",
        patientId: PATIENTS.samPatel.id,
        providerName: PROVIDERS.morganLee,
        locationName: LOCATIONS.northClinic,
        startAt: WEEK.tue1300,
        endAt: WEEK.tue1330,
        status: "scheduled",
      },
    },
    toolBehavior: {
      check_slot_availability: {
        outcome: "success",
        resultMessage: "Thursday 10:00 with Dr. Morgan Lee is available.",
      },
      reschedule_appointment: {
        outcome: "timeout",
        errorCode: "SCHEDULER_TIMEOUT",
        resultMessage:
          "No confirmation received from the scheduling system before timeout.",
      },
    },
  },
  {
    id: "APT-004",
    name: "Caller corrects requested time",
    workflow: "appointment_reschedule",
    difficulty: "medium",
    description:
      "Caller first asks for Tuesday 15:00, then corrects to Wednesday 11:00. Both slots are open and the tool would succeed for either. Ground truth is the corrected Wednesday slot, stored on requestedSlot — not the first mention in the conversation.",
    callerGoal:
      "Initially move Monday 15:00 to Tuesday 15:00, then correct to Wednesday 11:00 instead.",
    requiresEscalation: false,
    intentionallyUnavailableEvidence: [
      "Reason the caller changed days",
      "Calendar details outside the stated times",
    ],
    criticalEntities: {
      patientId: PATIENTS.caseyMoon.id,
      appointmentId: "appt_syn_apt004",
      requestedSlotId: "slot_syn_wed_1100_kim",
      correctedSlotId: "slot_syn_wed_1100_kim",
    },
    policy: { ...DEFAULT_POLICY },
    initialState: {
      workflow: "appointment_reschedule",
      patient: PATIENTS.caseyMoon,
      currentAppointment: {
        id: "appt_syn_apt004",
        patientId: PATIENTS.caseyMoon.id,
        providerName: PROVIDERS.averyKim,
        locationName: LOCATIONS.eastAnnex,
        startAt: WEEK.mon1500,
        endAt: WEEK.mon1530,
        status: "scheduled",
      },
      requestedSlot: {
        id: "slot_syn_wed_1100_kim",
        providerName: PROVIDERS.averyKim,
        locationName: LOCATIONS.eastAnnex,
        startAt: WEEK.wed1100,
        endAt: WEEK.wed1130,
        available: true,
      },
      supersededSlotRequests: [
        {
          id: "slot_syn_tue_1500_kim",
          providerName: PROVIDERS.averyKim,
          locationName: LOCATIONS.eastAnnex,
          startAt: WEEK.tue1500,
          endAt: WEEK.tue1530,
          available: true,
        },
      ],
      availableSlots: [
        {
          id: "slot_syn_tue_1500_kim",
          providerName: PROVIDERS.averyKim,
          locationName: LOCATIONS.eastAnnex,
          startAt: WEEK.tue1500,
          endAt: WEEK.tue1530,
          available: true,
        },
        {
          id: "slot_syn_wed_1100_kim",
          providerName: PROVIDERS.averyKim,
          locationName: LOCATIONS.eastAnnex,
          startAt: WEEK.wed1100,
          endAt: WEEK.wed1130,
          available: true,
        },
      ],
    },
    expectedOutcome: {
      workflow: "appointment_reschedule",
      completionAllowed: true,
      escalationRequired: false,
      requestedSlotShouldBeBooked: true,
      expectedAppointment: {
        id: "appt_syn_apt004",
        patientId: PATIENTS.caseyMoon.id,
        providerName: PROVIDERS.averyKim,
        locationName: LOCATIONS.eastAnnex,
        startAt: WEEK.wed1100,
        endAt: WEEK.wed1130,
        status: "rescheduled",
      },
    },
    toolBehavior: {
      check_slot_availability: {
        outcome: "success",
        resultMessage: "Tuesday 15:00 and Wednesday 11:00 are both available.",
      },
      // Tool succeeds for either open slot. Correctness is the Wednesday
      // expectedAppointment, not whichever time was mentioned first.
      reschedule_appointment: {
        outcome: "success",
        resultMessage:
          "Appointment can be moved to the slot supplied in the tool call.",
      },
    },
  },
];

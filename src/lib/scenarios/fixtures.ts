import type { Patient, Pharmacy } from "@/lib/domain";

/** Clearly synthetic patients. Names and IDs are fabricated. */
export const PATIENTS = {
  jordanHale: {
    id: "pt_syn_jordan_hale",
    displayName: "Jordan Hale (synthetic)",
  },
  rileyQuinn: {
    id: "pt_syn_riley_quinn",
    displayName: "Riley Quinn (synthetic)",
  },
  samPatel: {
    id: "pt_syn_sam_patel",
    displayName: "Sam Patel (synthetic)",
  },
  caseyMoon: {
    id: "pt_syn_casey_moon",
    displayName: "Casey Moon (synthetic)",
  },
  taylorBrooks: {
    id: "pt_syn_taylor_brooks",
    displayName: "Taylor Brooks (synthetic)",
  },
  morganEllis: {
    id: "pt_syn_morgan_ellis",
    displayName: "Morgan Ellis (synthetic)",
  },
  jamieOrtiz: {
    id: "pt_syn_jamie_ortiz",
    displayName: "Jamie Ortiz (synthetic)",
  },
  drewAlvarez: {
    id: "pt_syn_drew_alvarez",
    displayName: "Drew Alvarez (synthetic)",
  },
} as const satisfies Record<string, Patient>;

export const PROVIDERS = {
  morganLee: "Dr. Morgan Lee (synthetic)",
  averyKim: "Dr. Avery Kim (synthetic)",
} as const;

export const LOCATIONS = {
  northClinic: "North Clinic (synthetic)",
  eastAnnex: "East Annex (synthetic)",
} as const;

export const PHARMACIES = {
  mapleStreet: {
    id: "pharm_syn_maple_street",
    name: "Maple Street Pharmacy (synthetic)",
    address: "100 Example Ave, Testville, CA 00000",
    phone: "555-0100",
  },
  harborview: {
    id: "pharm_syn_harborview",
    name: "Harborview Pharmacy (synthetic)",
    address: "200 Sample Blvd, Testville, CA 00000",
    phone: "555-0142",
  },
} as const satisfies Record<string, Pharmacy>;

/** Fixed week used by all appointment fixtures so times are comparable. */
export const WEEK = {
  mon1000: "2026-09-14T10:00:00-07:00",
  mon1030: "2026-09-14T10:30:00-07:00",
  mon1500: "2026-09-14T15:00:00-07:00",
  mon1530: "2026-09-14T15:30:00-07:00",
  tue1300: "2026-09-15T13:00:00-07:00",
  tue1330: "2026-09-15T13:30:00-07:00",
  tue1500: "2026-09-15T15:00:00-07:00",
  tue1530: "2026-09-15T15:30:00-07:00",
  wed0900: "2026-09-16T09:00:00-07:00",
  wed0930: "2026-09-16T09:30:00-07:00",
  wed1100: "2026-09-16T11:00:00-07:00",
  wed1130: "2026-09-16T11:30:00-07:00",
  thu1000: "2026-09-17T10:00:00-07:00",
  thu1030: "2026-09-17T10:30:00-07:00",
  thu1400: "2026-09-17T14:00:00-07:00",
  thu1430: "2026-09-17T14:30:00-07:00",
  fri0900: "2026-09-18T09:00:00-07:00",
  fri0930: "2026-09-18T09:30:00-07:00",
  fri1100: "2026-09-18T11:00:00-07:00",
  fri1130: "2026-09-18T11:30:00-07:00",
  fri1500: "2026-09-18T15:00:00-07:00",
  fri1530: "2026-09-18T15:30:00-07:00",
} as const;

export const DEFAULT_POLICY = {
  requireStateConfirmedCompletion: true,
  mayOfferAlternativeSlots: false,
  mustEscalateForUrgentSymptoms: false,
  forbidOrdinaryCompletion: false,
} as const;

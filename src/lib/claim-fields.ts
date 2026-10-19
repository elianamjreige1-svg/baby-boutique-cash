export type ClaimData = {
  claimNo: string;
  accidentDate: string;
  insuredName: string;
  insuredPolicyNo: string;
  insuredVehicle: string;
  insuredPlateNo: string;
  otherName: string;
  otherPolicyNo: string;
  otherVehicle: string;
  otherPlateNo: string;
  amount: string;
  responsibility: string;
};

export function emptyClaim(): ClaimData {
  return {
    claimNo: "", accidentDate: "", insuredName: "", insuredPolicyNo: "", insuredVehicle: "", insuredPlateNo: "",
    otherName: "", otherPolicyNo: "", otherVehicle: "", otherPlateNo: "", amount: "", responsibility: "",
  };
}

export type Attachments = { discharge: boolean; bills: boolean; expert: boolean };

/** Blank values print as a fill-in line, like the paper letter. */
export const blank = (v: string) => (v.trim() ? v.trim() : "________________");

export function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

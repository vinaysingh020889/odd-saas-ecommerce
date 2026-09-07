export type RecoverableActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errorRef?: string;
};

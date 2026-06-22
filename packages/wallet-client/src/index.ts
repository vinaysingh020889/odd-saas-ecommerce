export type WalletAmount = {
  currency: "INR";
  amount: number;
};

export type WalletMockResponse = {
  enabled: false;
  mode: "mock";
  status: "disabled";
  message: string;
  referenceId?: string;
};

const disabledResponse: WalletMockResponse = {
  enabled: false,
  mode: "mock",
  status: "disabled",
  message: "Wallet is disabled for Phase 0."
};

export async function getWalletQuote(): Promise<WalletMockResponse> {
  return disabledResponse;
}

export async function lockWalletAmount(_amount: WalletAmount): Promise<WalletMockResponse> {
  return disabledResponse;
}

export async function confirmWalletDebit(_lockId: string): Promise<WalletMockResponse> {
  return disabledResponse;
}

export async function releaseWalletLock(_lockId: string): Promise<WalletMockResponse> {
  return disabledResponse;
}

export async function reverseWalletDebit(_debitId: string): Promise<WalletMockResponse> {
  return disabledResponse;
}

export interface LoginData {
  email: string;
  password: string;
}

/** A deliberately incomplete login body, for the negative login specs. */
export type InvalidLoginData = Partial<Record<keyof LoginData, unknown>>;

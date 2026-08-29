export interface LoginData {
  email: string;
  password: string;
}

export type InvalidLoginData = Partial<Record<keyof LoginData, unknown>>;

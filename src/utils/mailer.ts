interface PasswordResetPayload {
  email: string;
  token: string;
}

export const sendPasswordResetEmail = async ({ email, token }: PasswordResetPayload): Promise<void> => {
  console.log(`Password reset token for ${email}: ${token}`);
};
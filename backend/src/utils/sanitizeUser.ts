export const sanitizeUser = (user: any) => {
    if (!user) return null;

    const plain = user.toObject();

    delete plain.password;
    delete plain.refreshToken;
    delete plain.resetPasswordOtp;
    delete plain.resetPasswordOtpexpires;
    delete plain.__v;

    return plain;
};

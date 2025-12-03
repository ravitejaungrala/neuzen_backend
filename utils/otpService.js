class OTPService {
  constructor() {
    this.otpStore = new Map();
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  storeOTP(email, otp) {
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    this.otpStore.set(email, { otp, expiresAt });
    
    // Cleanup expired OTPs
    this.cleanupExpiredOTPs();
  }

  verifyOTP(email, otp) {
    const stored = this.otpStore.get(email);
    
    if (!stored) {
      return { valid: false, message: 'OTP not found or expired' };
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(email);
      return { valid: false, message: 'OTP expired' };
    }

    if (stored.otp !== otp) {
      return { valid: false, message: 'Invalid OTP' };
    }

    // OTP is valid, remove it
    this.otpStore.delete(email);
    return { valid: true, message: 'OTP verified successfully' };
  }

  cleanupExpiredOTPs() {
    const now = Date.now();
    for (const [email, data] of this.otpStore.entries()) {
      if (now > data.expiresAt) {
        this.otpStore.delete(email);
      }
    }
  }

  getRemainingTime(email) {
    const stored = this.otpStore.get(email);
    if (!stored) return 0;
    
    const remaining = stored.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }
}

export default new OTPService();
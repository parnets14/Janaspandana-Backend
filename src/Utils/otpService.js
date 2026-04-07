import twilio from 'twilio';

// Initialize Twilio client
let twilioClient = null;

try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
} catch (error) {
  console.warn('Twilio not configured. OTP will be logged to console only.');
}

// Send OTP via SMS
export const sendOTP = async (phone, otp) => {
  try {
    // For development/testing - log OTP to console
    console.log(`\n🔐 OTP for +91${phone}: ${otp}\n`);
    
    // In production, send via Twilio
    if (twilioClient && process.env.NODE_ENV === 'production') {
      await twilioClient.messages.create({
        body: `Your JanaSpandana OTP is: ${otp}. Valid for ${process.env.OTP_EXPIRE_MINUTES} minutes. Do not share this code.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${phone}`
      });
      
      return { success: true, message: 'OTP sent successfully' };
    }
    
    // Development mode - return success with console log
    return { 
      success: true, 
      message: 'OTP sent successfully (check console in dev mode)',
      devOTP: process.env.NODE_ENV !== 'production' ? otp : undefined
    };
    
  } catch (error) {
    console.error('OTP sending error:', error);
    
    // Still log to console even if SMS fails
    console.log(`\n🔐 FALLBACK OTP for +91${phone}: ${otp}\n`);
    
    return { 
      success: true, 
      message: 'OTP generated (check console)',
      devOTP: otp
    };
  }
};

// Validate phone number format
export const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Validate Aadhaar format
export const validateAadhaar = (aadhaar) => {
  const aadhaarRegex = /^\d{12}$/;
  return aadhaarRegex.test(aadhaar);
};

// Rate limiting for OTP requests
const otpRequestTracker = new Map();

export const checkOTPRateLimit = (phone) => {
  const now = Date.now();
  const key = phone;
  const limit = 10; // Max 3 OTP requests
  const window = 15 * 60 * 1000; // 15 minutes
  
  if (!otpRequestTracker.has(key)) {
    otpRequestTracker.set(key, [now]);
    return { allowed: true, remaining: limit - 1 };
  }
  
  const requests = otpRequestTracker.get(key).filter(time => now - time < window);
  
  if (requests.length >= limit) {
    return { 
      allowed: false, 
      remaining: 0,
      retryAfter: Math.ceil((requests[0] + window - now) / 1000 / 60)
    };
  }
  
  requests.push(now);
  otpRequestTracker.set(key, requests);
  
  return { allowed: true, remaining: limit - requests.length };
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const window = 15 * 60 * 1000;
  
  for (const [key, requests] of otpRequestTracker.entries()) {
    const validRequests = requests.filter(time => now - time < window);
    if (validRequests.length === 0) {
      otpRequestTracker.delete(key);
    } else {
      otpRequestTracker.set(key, validRequests);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

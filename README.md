# JanaSpandana Backend - Secure Authentication System

## 🔒 Security Features

### Government-Grade Security Implementation

1. **OTP-Based Authentication**
   - 6-digit OTP with SHA-256 hashing
   - 10-minute expiration
   - Maximum 3 attempts per OTP
   - Rate limiting: 3 OTP requests per 15 minutes

2. **JWT Token Security**
   - Access tokens (15 minutes expiry)
   - Refresh tokens (7 days expiry)
   - Secure token rotation
   - Token blacklisting on logout

3. **Account Protection**
   - Account lockout after 5 failed attempts
   - 2-hour lock duration
   - IP tracking and logging
   - User agent verification

4. **Data Security**
   - Aadhaar number hashing with bcrypt
   - Sensitive data never exposed in API responses
   - MongoDB injection protection
   - XSS attack prevention
   - HTTP Parameter Pollution prevention

5. **Rate Limiting**
   - Authentication routes: 5 requests per 15 minutes
   - OTP requests: 3 requests per 15 minutes
   - General API: 100 requests per 15 minutes

6. **API Security**
   - HTTPS enforcement in production
   - CORS protection
   - Helmet.js security headers
   - Request sanitization
   - No API endpoint exposure in console

## 📋 Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- Twilio account (for SMS OTP in production)

## 🚀 Installation

1. Install dependencies:
```bash
cd Backend
npm install
```

2. Configure environment variables in `.env`:
```env
# Database
MONGO_URI=your_mongodb_connection_string

# Server
PORT=5000

# JWT Secrets (CHANGE THESE!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Encryption (32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key

# Twilio (for production SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# OTP Settings
OTP_EXPIRE_MINUTES=10
MAX_OTP_ATTEMPTS=3

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Authentication Routes

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "9876543210",
  "aadhaar": "123456789012",
  "address": "123 Main St, City",
  "photo": "base64_or_url",
  "aadhaarPhoto": "base64_or_url"
}

Response:
{
  "success": true,
  "message": "Registration successful. OTP sent to your phone.",
  "data": {
    "userId": "user_id",
    "phone": "9876543210",
    "otpSent": true,
    "expiresIn": "10 minutes",
    "devOTP": "123456" // Only in development
  }
}
```

#### 2. Request OTP (Login)
```http
POST /api/auth/request-otp
Content-Type: application/json

{
  "phone": "9876543210"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "9876543210",
    "expiresIn": "10 minutes",
    "attemptsRemaining": 2,
    "devOTP": "123456" // Only in development
  }
}
```

#### 3. Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "phone": "9876543210",
      "maskedAadhaar": "XXXX-XXXX-9012",
      "role": "citizen",
      "isVerified": true
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "expiresIn": "15m"
  }
}
```

#### 4. Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token",
    "expiresIn": "15m"
  }
}
```

#### 5. Get Current User
```http
GET /api/auth/me
Authorization: Bearer {access_token}

Response:
{
  "success": true,
  "data": {
    "id": "user_id",
    "name": "John Doe",
    "phone": "9876543210",
    "maskedAadhaar": "XXXX-XXXX-9012",
    "role": "citizen"
  }
}
```

#### 6. Logout
```http
POST /api/auth/logout
Authorization: Bearer {access_token}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 🧪 Testing

### Development Mode
In development, OTP is logged to console:
```
🔐 OTP for +919876543210: 123456
```

### Production Mode
In production, OTP is sent via Twilio SMS.

## 🔐 Security Best Practices

1. **Never commit `.env` file**
2. **Use strong JWT secrets** (minimum 32 characters)
3. **Enable HTTPS in production**
4. **Configure Twilio for production SMS**
5. **Set up MongoDB authentication**
6. **Use environment-specific CORS origins**
7. **Enable MongoDB replica set for transactions**
8. **Set up monitoring and logging**
9. **Regular security audits**
10. **Keep dependencies updated**

## 🚨 Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (user/resource not found)
- `423` - Locked (account temporarily locked)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## 📊 Database Schema

### User Model
```javascript
{
  name: String (required, 2-100 chars),
  phone: String (required, unique, 10 digits),
  aadhaar: String (required, unique, 12 digits),
  aadhaarHash: String (hashed, not exposed),
  address: String (required, max 500 chars),
  photo: String (optional),
  aadhaarPhoto: String (optional),
  role: String (citizen/operator/officer/admin),
  isVerified: Boolean,
  isActive: Boolean,
  otp: String (hashed, not exposed),
  otpExpire: Date,
  otpAttempts: Number,
  failedLoginAttempts: Number,
  lockUntil: Date,
  refreshToken: String (not exposed),
  lastLogin: Date,
  loginHistory: Array,
  timestamps: true
}
```

## 🛡️ Security Headers

The API automatically sets these security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy`

## 📝 License

Government Project - Confidential

## 👥 Support

For issues or questions, contact the development team.

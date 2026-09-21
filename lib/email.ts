import nodemailer from 'nodemailer'

// SMTP Configuration from environment variables
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
}

// Create transporter
const transporter = nodemailer.createTransport(smtpConfig)

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!(smtpConfig.auth.user && smtpConfig.auth.pass)
}

// Generate strong random password
export function generateStrongPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + special
  
  let password = ''
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill remaining length with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Email templates
interface WelcomeEmailData {
  firstName: string
  lastName: string
  email: string
  password: string
  eventName: string
  seatDetails: string
  totalAmount: number
  orderId: string
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('Email is not configured. Skipping welcome email.')
    return false
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpConfig.auth.user
  const fromName = process.env.SMTP_FROM_NAME || 'HYPEFANZ.VIP'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HYPEFANZ.VIP</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(147, 51, 234, 0.3);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">
                🎉 Welcome to HYPEFANZ.VIP!
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Your VIP Experience Awaits
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #e0e0e0; font-size: 18px; margin: 0 0 20px 0;">
                Hello <strong style="color: #a855f7;">${data.firstName} ${data.lastName}</strong>,
              </p>
              
              <p style="color: #b0b0b0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Thank you for your purchase! Your VIP ticket has been confirmed and your account has been created.
              </p>
              
              <!-- Order Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(147, 51, 234, 0.1); border-radius: 12px; border: 1px solid rgba(147, 51, 234, 0.3); margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #a855f7; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      📋 Order Details
                    </h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #888; font-size: 14px;">Order ID:</td>
                        <td style="color: #fff; font-size: 14px; text-align: right;">${data.orderId}</td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 14px;">Event:</td>
                        <td style="color: #fff; font-size: 14px; text-align: right;">${data.eventName}</td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 14px;">Seats:</td>
                        <td style="color: #fff; font-size: 14px; text-align: right;">${data.seatDetails}</td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 14px; border-top: 1px solid rgba(147, 51, 234, 0.3); padding-top: 12px;">Total Paid:</td>
                        <td style="color: #22c55e; font-size: 18px; font-weight: 700; text-align: right; border-top: 1px solid rgba(147, 51, 234, 0.3); padding-top: 12px;">$${data.totalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Login Credentials -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #22c55e20 0%, #16a34a20 100%); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.3); margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #22c55e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      🔐 Your Login Credentials
                    </h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #888; font-size: 14px;">Email:</td>
                        <td style="color: #fff; font-size: 14px; text-align: right; font-family: monospace;">${data.email}</td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 14px;">Password:</td>
                        <td style="color: #22c55e; font-size: 16px; text-align: right; font-family: monospace; font-weight: 700;">${data.password}</td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; padding: 12px; background: rgba(251, 191, 36, 0.1); border-radius: 8px; color: #fbbf24; font-size: 12px; text-align: center;">
                      ⚠️ Please save your password securely. You can change it after logging in.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/signin" 
                       style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Login to Your Account →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 24px; text-align: center; border-top: 1px solid rgba(147, 51, 234, 0.2);">
              <p style="margin: 0 0 8px 0; color: #888; font-size: 14px;">
                Need help? Call us at 877-258-3111 or email Helo@hypefanz.vip
              </p>
              <p style="margin: 0; color: #666; font-size: 12px;">
                © ${new Date().getFullYear()} HYPEFANZ.VIP. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const textContent = `
Welcome to HYPEFANZ.VIP!

Hello ${data.firstName} ${data.lastName},

Thank you for your purchase! Your VIP ticket has been confirmed.

ORDER DETAILS:
- Order ID: ${data.orderId}
- Event: ${data.eventName}
- Seats: ${data.seatDetails}
- Total Paid: $${data.totalAmount.toFixed(2)}

YOUR LOGIN CREDENTIALS:
- Email: ${data.email}
- Password: ${data.password}

Please save your password securely. You can change it after logging in.

Login at: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/signin

Need help? Call us at 877-258-3111 or email Helo@hypefanz.vip

© ${new Date().getFullYear()} HYPEFANZ.VIP. All rights reserved.
`

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.email,
      subject: `🎉 Welcome to HYPEFANZ.VIP - Your Ticket for ${data.eventName}`,
      text: textContent,
      html: htmlContent,
    })
    console.log(`Welcome email sent to ${data.email}`)
    return true
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return false
  }
}

// Ticket confirmation email for existing users
interface TicketConfirmationData {
  firstName: string
  email: string
  eventName: string
  seatDetails: string
  totalAmount: number
  orderId: string
}

export async function sendTicketConfirmationEmail(data: TicketConfirmationData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('Email is not configured. Skipping ticket confirmation email.')
    return false
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpConfig.auth.user
  const fromName = process.env.SMTP_FROM_NAME || 'HYPEFANZ.VIP'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Confirmation - HYPEFANZ.VIP</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(147, 51, 234, 0.3);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">
                🎫 Ticket Confirmed!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #e0e0e0; font-size: 18px; margin: 0 0 20px 0;">
                Hello <strong style="color: #a855f7;">${data.firstName}</strong>,
              </p>
              
              <p style="color: #b0b0b0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your VIP ticket purchase has been confirmed! Here are your order details:
              </p>
              
              <!-- Order Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(147, 51, 234, 0.1); border-radius: 12px; border: 1px solid rgba(147, 51, 234, 0.3); margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #888; font-size: 14px;">Order ID:</td>
                        <td style="color: #fff; font-size: 14px; text-align: right;">${data.orderId}</td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 14px;">Event:</td>
                        <td style="color: #fff; font-size: 14px; text-align: right;">${data.eventName}</td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 14px;">Seats:</td>
                        <td style="color: #fff; font-size: 14px; text-align: right;">${data.seatDetails}</td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 14px; border-top: 1px solid rgba(147, 51, 234, 0.3); padding-top: 12px;">Total Paid:</td>
                        <td style="color: #22c55e; font-size: 18px; font-weight: 700; text-align: right; border-top: 1px solid rgba(147, 51, 234, 0.3); padding-top: 12px;">$${data.totalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/my-tickets" 
                       style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      View My Tickets →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 24px; text-align: center; border-top: 1px solid rgba(147, 51, 234, 0.2);">
              <p style="margin: 0 0 8px 0; color: #888; font-size: 14px;">
                Need help? Call us at 877-258-3111 or email Helo@hypefanz.vip
              </p>
              <p style="margin: 0; color: #666; font-size: 12px;">
                © ${new Date().getFullYear()} HYPEFANZ.VIP. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.email,
      subject: `🎫 Ticket Confirmed - ${data.eventName}`,
      html: htmlContent,
    })
    console.log(`Ticket confirmation email sent to ${data.email}`)
    return true
  } catch (error) {
    console.error('Failed to send ticket confirmation email:', error)
    return false
  }
}

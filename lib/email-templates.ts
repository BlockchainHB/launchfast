// Email template system with custom styling for Launch Fast

interface EmailTemplateProps {
  preheaderText: string;
  mainHeading: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  securityTitle?: string;
  securityText?: string;
  additionalContent?: string;
  alternativeUrl?: string;
}

const baseEmailTemplate = (props: EmailTemplateProps) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="format-detection" content="telephone=no" />
    <title>${props.mainHeading} - Launch Fast</title>
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style type="text/css">
        /* CLIENT-SPECIFIC STYLES */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        
        /* RESET STYLES */
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        
        /* iOS BLUE LINKS */
        a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: none !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
        }
        
        /* GMAIL BLUE LINKS */
        u + #body a {
            color: inherit;
            text-decoration: none;
            font-size: inherit;
            font-family: inherit;
            font-weight: inherit;
            line-height: inherit;
        }
        
        /* SAMSUNG BLUE LINKS */
        #MessageViewBody a {
            color: inherit;
            text-decoration: none;
            font-size: inherit;
            font-family: inherit;
            font-weight: inherit;
            line-height: inherit;
        }
        
        /* Universal styles */
        .email-body {
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
        }
        
        .email-container {
            background-color: #ffffff;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .header-table {
            background-color: #ffffff;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .content-table {
            background-color: #ffffff;
        }
        
        .footer-table {
            background-color: #f8f8f8;
            border-top: 1px solid #e0e0e0;
        }
        
        .logo-text {
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            text-decoration: none;
        }
        
        .main-heading {
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
            padding: 0;
        }
        
        .body-text {
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 16px;
            line-height: 24px;
            color: #333333;
            margin: 0;
            padding: 0;
        }
        
        .cta-button {
            background-color: #007bff;
            border: none;
            border-radius: 4px;
            color: #ffffff;
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 16px;
            font-weight: bold;
            text-decoration: none;
            text-align: center;
            display: inline-block;
            padding: 16px 32px;
            mso-padding-alt: 0;
        }
        
        .cta-button:hover {
            background-color: #0056b3;
        }
        
        /*[if mso]>
        .cta-button {
            padding: 0;
        }
        .cta-button-inner {
            padding: 16px 32px;
        }
        <![endif]*/
        
        .security-box {
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 16px;
            margin: 24px 0;
        }
        
        .security-title {
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 14px;
            font-weight: bold;
            color: #495057;
            margin: 0 0 8px 0;
        }
        
        .security-text {
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 14px;
            line-height: 20px;
            color: #6c757d;
            margin: 0;
        }
        
        .footer-text {
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 12px;
            line-height: 18px;
            color: #6c757d;
            margin: 0;
        }
        
        .footer-link {
            color: #007bff;
            text-decoration: underline;
        }
        
        .divider {
            border-top: 1px solid #e0e0e0;
            margin: 24px 0;
        }
        
        /* MEDIA QUERIES */
        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                max-width: 100% !important;
            }
            
            .mobile-padding {
                padding-left: 16px !important;
                padding-right: 16px !important;
            }
            
            .mobile-center {
                text-align: center !important;
            }
            
            .cta-button {
                width: 100% !important;
                max-width: 280px !important;
            }
        }
    </style>
</head>
<body class="email-body" id="body">
    <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${props.preheaderText}
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                    
                    <!-- HEADER -->
                    <tr>
                        <td>
                            <table class="header-table" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding: 32px 40px; text-align: left;" class="mobile-padding mobile-center">
                                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}" class="logo-text" style="text-decoration: none;">Launch Fast</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- MAIN CONTENT -->
                    <tr>
                        <td>
                            <table class="content-table" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding: 40px;" class="mobile-padding">
                                        
                                        <!-- Main Heading -->
                                        <h1 class="main-heading" style="margin-bottom: 24px;">${props.mainHeading}</h1>
                                        
                                        <!-- Body Content -->
                                        ${props.bodyContent}
                                        
                                        ${props.ctaText && props.ctaUrl ? `
                                        <!-- CTA Button -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                                            <tr>
                                                <td style="text-align: center;">
                                                    <a href="${props.ctaUrl}" class="cta-button" target="_blank">
                                                        <!--[if mso]><span class="cta-button-inner"><![endif]-->
                                                        ${props.ctaText}
                                                        <!--[if mso]></span><![endif]-->
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}
                                        
                                        ${props.securityTitle && props.securityText ? `
                                        <!-- Security Notice -->
                                        <div class="security-box">
                                            <p class="security-title">${props.securityTitle}</p>
                                            <p class="security-text">
                                                ${props.securityText}
                                            </p>
                                        </div>
                                        ` : ''}
                                        
                                        ${props.additionalContent ? props.additionalContent : ''}
                                        
                                        ${props.alternativeUrl ? `
                                        <!-- Divider -->
                                        <div class="divider"></div>
                                        
                                        <!-- Alternative Link -->
                                        <p class="body-text" style="margin-bottom: 16px;">
                                            <strong>Having trouble with the button above?</strong>
                                        </p>
                                        <p class="body-text" style="margin-bottom: 8px;">
                                            Copy and paste this link into your browser:
                                        </p>
                                        <p style="font-family: 'Courier New', Courier, monospace; font-size: 14px; color: #007bff; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px; margin: 0;">
                                            ${props.alternativeUrl}
                                        </p>
                                        ` : ''}
                                        
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td>
                            <table class="footer-table" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding: 32px 40px; text-align: center;" class="mobile-padding">
                                        
                                        <p class="footer-text" style="margin-bottom: 16px;">
                                            <strong>Need assistance?</strong><br>
                                            Contact our support team at <a href="mailto:launchfastlegacyx@gmail.com" class="footer-link">launchfastlegacyx@gmail.com</a>
                                        </p>
                                        
                                        <p class="footer-text" style="margin-bottom: 16px;">
                                            This email was sent to you because an account was created with Launch Fast using this email address.
                                        </p>
                                        
                                        <p class="footer-text" style="margin-bottom: 0;">
                                            Built by LegacyX FBA<br>
                                            <a href="#" class="footer-link">Unsubscribe</a>
                                        </p>
                                        
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
    
</body>
</html>
`;

// Signup confirmation email template
export const signupConfirmationEmail = (confirmationUrl: string) => {
  return baseEmailTemplate({
    preheaderText: "Please confirm your email address to complete your Launch Fast account setup. This verification link expires in 24 hours.",
    mainHeading: "Email Address Confirmation Required",
    bodyContent: `
      <p class="body-text" style="margin-bottom: 24px;">
        Thank you for creating your Launch Fast account. To ensure the security of your account and complete the registration process, please confirm your email address.
      </p>
    `,
    ctaText: "Confirm Email Address",
    ctaUrl: confirmationUrl,
    securityTitle: "Security Information",
    securityText: "This verification link will expire in 24 hours for your security. If you did not create this account, please disregard this email. No further action is required.",
    additionalContent: `
      <p class="body-text" style="margin-bottom: 16px;">
        <strong>Next Steps:</strong>
      </p>
      <p class="body-text" style="margin-bottom: 24px;">
        After confirming your email address, you will be redirected to complete your account setup and select your subscription plan.
      </p>
    `,
    alternativeUrl: confirmationUrl
  });
};

// Password reset request email template
export const passwordResetRequestEmail = (resetUrl: string, userEmail: string) => {
  return baseEmailTemplate({
    preheaderText: "Reset your Launch Fast password securely. This link expires in 60 minutes for your security.",
    mainHeading: "Password Reset Request",
    bodyContent: `
      <p class="body-text" style="margin-bottom: 24px;">
        We received a request to reset the password for your Launch Fast account associated with <strong>${userEmail}</strong>.
      </p>
      <p class="body-text" style="margin-bottom: 24px;">
        If you requested this password reset, click the button below to set a new password. If you did not request this reset, you can safely ignore this email.
      </p>
    `,
    ctaText: "Reset Password",
    ctaUrl: resetUrl,
    securityTitle: "Security Information",
    securityText: "This password reset link will expire in 60 minutes for your security. The link can only be used once. If you did not request this password reset, please contact our support team immediately.",
    additionalContent: `
      <p class="body-text" style="margin-bottom: 16px;">
        <strong>What happens next:</strong>
      </p>
      <p class="body-text" style="margin-bottom: 24px;">
        After clicking the reset link, you'll be taken to a secure page where you can enter your new password.
      </p>
    `,
    alternativeUrl: resetUrl
  });
};

// Password reset confirmation email template
export const passwordResetConfirmationEmail = (userEmail: string) => {
  return baseEmailTemplate({
    preheaderText: "Your Launch Fast password has been successfully changed. Your account is now secure with the new password.",
    mainHeading: "Password Successfully Changed",
    bodyContent: `
      <p class="body-text" style="margin-bottom: 24px;">
        Your password for Launch Fast account <strong>${userEmail}</strong> has been successfully changed.
      </p>
      <p class="body-text" style="margin-bottom: 24px;">
        You can now log in to your account using your new password. If you did not make this change, please contact our support team immediately.
      </p>
    `,
    ctaText: "Sign In to Your Account",
    ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/login`,
    securityTitle: "Security Notice",
    securityText: "If you did not change your password, please contact our support team immediately at launchfastlegacyx@gmail.com. Your account security is our priority.",
    additionalContent: `
      <p class="body-text" style="margin-bottom: 16px;">
        <strong>Security Tips:</strong>
      </p>
      <p class="body-text" style="margin-bottom: 24px;">
        Keep your password secure and never share it with anyone. Consider using a password manager to generate and store strong, unique passwords.
      </p>
    `
  });
};

// Trial reminder email template
export const trialReminderEmail = (daysRemaining: number, promoCodeUsed: string, userEmail: string) => {
  const isUrgent = daysRemaining <= 3;
  const isCritical = daysRemaining <= 1;
  
  let urgencyText = '';
  let headingText = '';
  let ctaButtonColor = '#007bff';
  
  if (isCritical) {
    urgencyText = '🚨 Final Notice';
    headingText = `${daysRemaining === 0 ? 'Your Trial Expires Today!' : 'Only 1 Day Left in Your Trial!'}`;
    ctaButtonColor = '#dc3545'; // Red for critical
  } else if (isUrgent) {
    urgencyText = '⚠️ Important Reminder';
    headingText = `${daysRemaining} Days Left in Your Free Trial`;
    ctaButtonColor = '#fd7e14'; // Orange for urgent
  } else {
    urgencyText = '✨ Trial Reminder';
    headingText = `${daysRemaining} Days Remaining in Your Free Trial`;
  }

  return baseEmailTemplate({
    preheaderText: `${urgencyText} - Don't lose access to your Amazon intelligence data. Subscribe now to continue using LaunchFast.`,
    mainHeading: headingText,
    bodyContent: `
      <p class="body-text" style="margin-bottom: 24px;">
        Hi there! Your 7-day free trial of LaunchFast is coming to an end. You have <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining</strong> to continue accessing your Amazon product intelligence dashboard.
      </p>
      
      ${promoCodeUsed ? `
      <div style="background-color: #e7f3ff; border: 1px solid #bee5eb; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p class="body-text" style="margin: 0; color: #0c5460;">
          <strong>🎉 Webinar Attendee:</strong> You used code <strong>${promoCodeUsed}</strong> to access this trial.
        </p>
      </div>
      ` : ''}
      
      <p class="body-text" style="margin-bottom: 24px;">
        <strong>What you'll lose access to:</strong>
      </p>
      <ul style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0 0 24px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Product research and ASIN analysis</li>
        <li style="margin-bottom: 8px;">Keyword mining and optimization tools</li>
        <li style="margin-bottom: 8px;">Market opportunity identification</li>
        <li style="margin-bottom: 8px;">Competitor analysis insights</li>
        <li style="margin-bottom: 8px;">Real-time BSR tracking</li>
        <li style="margin-bottom: 8px;">All your saved research data</li>
      </ul>
      
      ${isCritical ? `
      <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p class="body-text" style="margin: 0; color: #721c24;">
          <strong>⏰ Time is running out!</strong> Your trial expires ${daysRemaining === 0 ? 'today' : 'tomorrow'}. Subscribe now to avoid losing access to all your research data.
        </p>
      </div>
      ` : ''}
    `,
    ctaText: "Subscribe Now - $199/month",
    ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/api/stripe/create-checkout?plan=pro&email=${encodeURIComponent(userEmail)}`,
    additionalContent: `
      <div style="text-align: center; margin: 32px 0;">
        <p class="body-text" style="margin-bottom: 16px;">
          <strong>Full access to LaunchFast Pro includes:</strong>
        </p>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; text-align: left;">
          <ul style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">✅ Unlimited product research</li>
            <li style="margin-bottom: 8px;">✅ Advanced keyword analysis</li>
            <li style="margin-bottom: 8px;">✅ Market trend insights</li>
            <li style="margin-bottom: 8px;">✅ Competitor tracking</li>
            <li style="margin-bottom: 8px;">✅ Export capabilities</li>
            <li style="margin-bottom: 8px;">✅ Priority support</li>
            <li style="margin-bottom: 0;">✅ Cancel anytime</li>
          </ul>
        </div>
      </div>
      
      <p class="body-text" style="margin-bottom: 16px; text-align: center;">
        <strong>Questions about LaunchFast?</strong>
      </p>
      <p class="body-text" style="margin-bottom: 24px; text-align: center;">
        Reply to this email or contact us at <a href="mailto:launchfastlegacyx@gmail.com" style="color: #007bff;">launchfastlegacyx@gmail.com</a>
      </p>
    `
  }).replace('background-color: #007bff;', `background-color: ${ctaButtonColor};`)
    .replace('background-color: #0056b3;', `background-color: ${ctaButtonColor === '#007bff' ? '#0056b3' : ctaButtonColor};`);
};

// Trial expired email template
export const trialExpiredEmail = (promoCodeUsed: string, userEmail: string) => {
  return baseEmailTemplate({
    preheaderText: "Your LaunchFast trial has expired. Subscribe now to regain access to your Amazon intelligence dashboard and data.",
    mainHeading: "Your Free Trial Has Expired",
    bodyContent: `
      <p class="body-text" style="margin-bottom: 24px;">
        Your 7-day free trial of LaunchFast has ended. Don't worry - your data is safe and waiting for you when you subscribe!
      </p>
      
      ${promoCodeUsed ? `
      <div style="background-color: #e7f3ff; border: 1px solid #bee5eb; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p class="body-text" style="margin: 0; color: #0c5460;">
          <strong>🎉 Thank you for being a webinar attendee!</strong> You used code <strong>${promoCodeUsed}</strong> for your trial.
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p class="body-text" style="margin: 0; color: #856404;">
          <strong>🔒 Your Research Data is Secure:</strong> All your saved research, keywords, and analysis are safely stored and will be immediately available when you subscribe.
        </p>
      </div>
      
      <p class="body-text" style="margin-bottom: 24px;">
        <strong>What you're missing out on:</strong>
      </p>
      <ul style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0 0 24px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Access to your saved product research</li>
        <li style="margin-bottom: 8px;">New market opportunities and insights</li>
        <li style="margin-bottom: 8px;">Keyword mining and analysis tools</li>
        <li style="margin-bottom: 8px;">Competitor tracking features</li>
        <li style="margin-bottom: 8px;">Export and reporting capabilities</li>
      </ul>
      
      <p class="body-text" style="margin-bottom: 24px;">
        Subscribe now to pick up exactly where you left off. Your dashboard and all data will be restored immediately.
      </p>
    `,
    ctaText: "Reactivate Your Account - $199/month",
    ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/api/stripe/create-checkout?plan=pro&email=${encodeURIComponent(userEmail)}`,
    securityTitle: "Need Help?",
    securityText: "If you have questions about your subscription or need assistance, reply to this email or contact our support team at launchfastlegacyx@gmail.com. We're here to help!",
    additionalContent: `
      <div style="text-align: center; margin: 32px 0;">
        <p class="body-text" style="margin-bottom: 16px;">
          <strong>LaunchFast Pro Features:</strong>
        </p>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; text-align: left;">
          <div style="display: flex; flex-wrap: wrap; gap: 16px;">
            <div style="flex: 1; min-width: 250px;">
              <ul style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 14px; line-height: 20px; color: #333333; margin: 0; padding-left: 16px;">
                <li style="margin-bottom: 6px;">Unlimited product searches</li>
                <li style="margin-bottom: 6px;">Advanced filtering options</li>
                <li style="margin-bottom: 6px;">Historical trend data</li>
                <li style="margin-bottom: 6px;">Bulk export capabilities</li>
              </ul>
            </div>
            <div style="flex: 1; min-width: 250px;">
              <ul style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 14px; line-height: 20px; color: #333333; margin: 0; padding-left: 16px;">
                <li style="margin-bottom: 6px;">Real-time BSR tracking</li>
                <li style="margin-bottom: 6px;">Keyword opportunity scoring</li>
                <li style="margin-bottom: 6px;">Priority customer support</li>
                <li style="margin-bottom: 6px;">Cancel anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `
  });
};

// Trial welcome email template
export const trialWelcomeEmail = (promoCodeUsed: string, trialEndDate: string, userEmail: string) => {
  return baseEmailTemplate({
    preheaderText: "Welcome to your 7-day LaunchFast trial! Start exploring powerful Amazon product intelligence tools right away.",
    mainHeading: "🎉 Your Free Trial is Now Active!",
    bodyContent: `
      <p class="body-text" style="margin-bottom: 24px;">
        Congratulations! Your 7-day free trial of LaunchFast is now active and ready to use.
      </p>
      
      ${promoCodeUsed ? `
      <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p class="body-text" style="margin: 0; color: #0c5460;">
          <strong>✨ Webinar Special:</strong> You successfully redeemed code <strong>${promoCodeUsed}</strong> for exclusive access!
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p class="body-text" style="margin: 0; color: #155724;">
          <strong>⏰ Trial Details:</strong> Your free trial ends on <strong>${new Date(trialEndDate).toLocaleDateString()}</strong>. Mark your calendar!
        </p>
      </div>
      
      <p class="body-text" style="margin-bottom: 24px;">
        <strong>Get started with these powerful features:</strong>
      </p>
      <ul style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0 0 24px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong>Product Research:</strong> Analyze any ASIN for profitability insights</li>
        <li style="margin-bottom: 8px;"><strong>Keyword Mining:</strong> Discover high-opportunity keywords</li>
        <li style="margin-bottom: 8px;"><strong>Market Analysis:</strong> Identify trending products and niches</li>
        <li style="margin-bottom: 8px;"><strong>Competitor Tracking:</strong> Monitor competitor performance</li>
        <li style="margin-bottom: 8px;"><strong>BSR Monitoring:</strong> Track Best Seller Rank changes</li>
      </ul>
    `,
    ctaText: "Start Exploring LaunchFast",
    ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/dashboard`,
    additionalContent: `
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin: 32px 0;">
        <p class="body-text" style="margin-bottom: 16px;">
          <strong>💡 Quick Start Tips:</strong>
        </p>
        <ol style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 12px;">Start by researching a product you're familiar with to see LaunchFast in action</li>
          <li style="margin-bottom: 12px;">Use the keyword mining tool to discover new opportunities in your niche</li>
          <li style="margin-bottom: 12px;">Save interesting products to your dashboard for easy reference</li>
          <li style="margin-bottom: 12px;">Explore different markets to understand the breadth of available data</li>
        </ol>
      </div>
      
      <p class="body-text" style="margin-bottom: 16px; text-align: center;">
        <strong>Questions or need help getting started?</strong>
      </p>
      <p class="body-text" style="margin-bottom: 24px; text-align: center;">
        Our support team is here to help! Email us at <a href="mailto:launchfastlegacyx@gmail.com" style="color: #007bff;">launchfastlegacyx@gmail.com</a>
      </p>
    `
  });
};
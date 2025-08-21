import * as nodemailer from 'nodemailer';
import { AuthConfig } from '@core/auth/types';

/**
 * Email service for sending verification emails, password resets, and notifications.
 * Uses nodemailer with configurable transport options.
 * Provides email template rendering and async sending.
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: AuthConfig['email'];
  private appUrl: string;

  constructor(config: AuthConfig['email'], smtpConfig: any, appUrl: string) {
    this.config = config;
    this.appUrl = appUrl;
    
    // Create transporter with SMTP config
    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure, // true for 465, false for other ports
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });
  }

  /**
   * Sends email verification to new user.
   * @param {string} email - Recipient email
   * @param {string} token - Verification token
   * @returns {Promise<void>}
   */
  public async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.appUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
    
    const subject = 'Welcome to SpaceCommand - Verify Your Email';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border: 2px solid #00ff00; padding: 20px; text-align: center; }
          .content { margin: 30px 0; }
          .button { 
            display: inline-block; 
            padding: 15px 30px; 
            background: #00ff00; 
            color: #000; 
            text-decoration: none; 
            font-weight: bold;
            border: 2px solid #00ff00;
          }
          .button:hover { background: #000; color: #00ff00; }
          .footer { margin-top: 30px; font-size: 12px; color: #888; }
          .ascii-art { font-size: 10px; line-height: 1; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <pre class="ascii-art">
   _____ ____   ____   ____ _____ ____ ____  __  __ __  __   ____   _   _ ____  
  / ____|  _ \\ / __ \\ / ___| ____/ ___/ __ \\|  \\/  |  \\/  | / __ \\ | \\ | |  _ \\ 
 | (___ | |_) | |  | | |   |  _|| |  | |  | | |\\/| | |\\/| || |  | ||  \\| | | | |
  \\___ \\|  __/| |  | | |   | |__| |__| |  | | |  | | |  | || |  | || . \` | | | |
  ____) | |   | |__| | |___|____|\\____\\____/|_|  |_|_|  |_|| |__| || |\\  | |_| |
 |_____/|_|    \\____/ \\____|                                \\____/ |_| \\_|____/ 
            </pre>
            <h1>WELCOME, COMMANDER</h1>
          </div>
          
          <div class="content">
            <p>Greetings, Commander!</p>
            
            <p>Your registration at SpaceCommand Central has been received. To complete your 
            enrollment and gain access to the galactic trade networks, please verify your 
            communication channel.</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="button">VERIFY COMMUNICATION CHANNEL</a>
            </p>
            
            <p>If the above link doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #00ff00;">${verificationUrl}</p>
            
            <p>This verification link will expire in ${this.config.verificationExpiryHours} hours.</p>
            
            <p>If you did not request this registration, please disregard this transmission.</p>
          </div>
          
          <div class="footer">
            <p>================================</p>
            <p>SpaceCommand Central Authority</p>
            <p>Sector 7, Terran Federation</p>
            <p>================================</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
SPACECOMMAND CENTRAL
=====================

Welcome, Commander!

Your registration at SpaceCommand Central has been received. To complete your 
enrollment and gain access to the galactic trade networks, please verify your 
communication channel.

Verify your email: ${verificationUrl}

This verification link will expire in ${this.config.verificationExpiryHours} hours.

If you did not request this registration, please disregard this transmission.

================================
SpaceCommand Central Authority
Sector 7, Terran Federation
================================
    `;
    
    await this.sendEmail(email, subject, textContent, htmlContent);
  }

  /**
   * Sends password reset email.
   * @param {string} email - Recipient email
   * @param {string} token - Reset token
   * @returns {Promise<void>}
   */
  public async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    
    const subject = 'SpaceCommand - Security Protocol Reset Request';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #ff9900; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border: 2px solid #ff9900; padding: 20px; text-align: center; }
          .content { margin: 30px 0; }
          .button { 
            display: inline-block; 
            padding: 15px 30px; 
            background: #ff9900; 
            color: #000; 
            text-decoration: none; 
            font-weight: bold;
            border: 2px solid #ff9900;
          }
          .button:hover { background: #000; color: #ff9900; }
          .footer { margin-top: 30px; font-size: 12px; color: #888; }
          .warning { color: #ff0000; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ SECURITY ALERT ⚠️</h1>
            <h2>PASSWORD RESET REQUEST</h2>
          </div>
          
          <div class="content">
            <p>Commander,</p>
            
            <p>A security protocol reset has been requested for your SpaceCommand account.</p>
            
            <p class="warning">If you did not request this reset, your account may be compromised. 
            Contact Central Authority immediately.</p>
            
            <p>To reset your security credentials, use the following link:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">RESET SECURITY PROTOCOL</a>
            </p>
            
            <p>If the above link doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #ff9900;">${resetUrl}</p>
            
            <p>This link will expire in ${this.config.resetExpiryHours} hour(s) for security reasons.</p>
            
            <p>After resetting your password, all existing sessions will be terminated and you 
            will need to log in again on all devices.</p>
          </div>
          
          <div class="footer">
            <p>================================</p>
            <p>SpaceCommand Security Division</p>
            <p>Automated Security System</p>
            <p>================================</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
SECURITY ALERT - SPACECOMMAND
==============================

Commander,

A security protocol reset has been requested for your SpaceCommand account.

*** WARNING ***
If you did not request this reset, your account may be compromised. 
Contact Central Authority immediately.

To reset your security credentials, visit:
${resetUrl}

This link will expire in ${this.config.resetExpiryHours} hour(s) for security reasons.

After resetting your password, all existing sessions will be terminated and you 
will need to log in again on all devices.

================================
SpaceCommand Security Division
Automated Security System
================================
    `;
    
    await this.sendEmail(email, subject, textContent, htmlContent);
  }

  /**
   * Sends welcome email after successful registration.
   * @param {string} email - Recipient email
   * @param {string} username - User's chosen username
   * @returns {Promise<void>}
   */
  public async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const subject = 'Welcome Aboard, Commander!';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border: 2px solid #00ff00; padding: 20px; text-align: center; }
          .content { margin: 30px 0; }
          .tips { background: #001100; border: 1px solid #00ff00; padding: 15px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>WELCOME TO SPACECOMMAND</h1>
            <h2>Commander ${username}</h2>
          </div>
          
          <div class="content">
            <p>Congratulations, Commander!</p>
            
            <p>Your registration is complete and your ship is ready for launch. The galaxy 
            awaits your command!</p>
            
            <div class="tips">
              <h3>🚀 Getting Started:</h3>
              <ul>
                <li>Choose your starting faction wisely - it affects your initial reputation</li>
                <li>Begin with simple trade routes to build capital</li>
                <li>Upgrade your fleet gradually as you gain experience</li>
                <li>Form alliances with other commanders for mutual benefit</li>
                <li>Check the market prices regularly - fortunes are made in arbitrage</li>
              </ul>
            </div>
            
            <p>Your starting credits: 10,000 ¢</p>
            <p>Your first ship: Scout Class Courier</p>
            
            <p>May the stars guide your path to prosperity!</p>
          </div>
          
          <div class="footer">
            <p>================================</p>
            <p>SpaceCommand Central Authority</p>
            <p>New Commander Orientation Division</p>
            <p>================================</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
WELCOME TO SPACECOMMAND
========================

Congratulations, Commander ${username}!

Your registration is complete and your ship is ready for launch. The galaxy 
awaits your command!

GETTING STARTED:
- Choose your starting faction wisely - it affects your initial reputation
- Begin with simple trade routes to build capital
- Upgrade your fleet gradually as you gain experience
- Form alliances with other commanders for mutual benefit
- Check the market prices regularly - fortunes are made in arbitrage

Your starting credits: 10,000 ¢
Your first ship: Scout Class Courier

May the stars guide your path to prosperity!

================================
SpaceCommand Central Authority
New Commander Orientation Division
================================
    `;
    
    await this.sendEmail(email, subject, textContent, htmlContent);
  }

  /**
   * Core email sending method.
   * @private
   */
  private async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string
  ): Promise<void> {
    const mailOptions = {
      from: this.config.from,
      replyTo: this.config.replyTo || this.config.from,
      to,
      subject,
      text,
      html
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw new Error('Email delivery failed');
    }
  }

  /**
   * Verifies email configuration is valid.
   * @returns {Promise<boolean>} True if configuration is valid
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}
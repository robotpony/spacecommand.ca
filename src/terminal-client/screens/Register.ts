import { Screen, ScreenTransition } from '../types';
import { Window } from '@modules/ux/components/Window';
import { Form } from '@modules/ux/components/Form';
import { Text } from '@modules/ux/components/Text';
import { colors } from '@modules/ux/utils/colors';

/**
 * Registration screen for new user accounts.
 * Provides email/username/password registration with validation.
 * Supports invite codes and handles different registration modes.
 */
export class RegisterScreen implements Screen {
  public readonly id = 'register';
  public readonly title = 'Commander Registration';
  
  private window: Window;
  private form: Form;
  private errorMessage: string = '';
  private successMessage: string = '';
  private isLoading: boolean = false;
  private passwordStrength: string = '';
  private registrationMode: 'open' | 'invite' | 'admin_approval' = 'open';

  constructor() {
    this.window = new Window({
      title: 'SPACECOMMAND REGISTRATION',
      width: 80,
      height: 30,
      border: 'double',
      padding: 2
    });

    this.form = new Form({
      fields: [
        {
          id: 'email',
          label: 'Communication Channel (Email)',
          type: 'email',
          required: true,
          placeholder: 'commander@example.com'
        },
        {
          id: 'username',
          label: 'Commander Callsign',
          type: 'text',
          required: true,
          placeholder: 'SpaceCommander123',
          minLength: 3,
          maxLength: 50
        },
        {
          id: 'password',
          label: 'Security Code',
          type: 'password',
          required: true,
          placeholder: 'Minimum 12 characters',
          minLength: 12
        },
        {
          id: 'confirmPassword',
          label: 'Confirm Security Code',
          type: 'password',
          required: true,
          placeholder: 'Re-enter your password'
        },
        {
          id: 'inviteCode',
          label: 'Invitation Code (if required)',
          type: 'text',
          required: false,
          placeholder: 'ABC12345'
        }
      ],
      submitLabel: 'REQUEST COMMANDER STATUS',
      cancelLabel: 'BACK TO LOGIN'
    });
  }

  public async render(): Promise<string> {
    const content = [];
    
    // ASCII art header
    content.push(colors.green(`
    ╔════════════════════════════════════════════════════════╗
    ║        SPACECOMMAND CENTRAL RECRUITMENT OFFICE         ║
    ║            NEW COMMANDER REGISTRATION SYSTEM           ║
    ╚════════════════════════════════════════════════════════╝
    `));
    
    content.push('');
    
    if (this.errorMessage) {
      content.push(colors.red(`⚠️  ERROR: ${this.errorMessage}`));
      content.push('');
    }
    
    if (this.successMessage) {
      content.push(colors.green(`✅ ${this.successMessage}`));
      content.push('');
    }
    
    // Registration mode notice
    const modeMessages = {
      open: 'Open recruitment - All qualified candidates welcome!',
      invite: 'Invitation-only recruitment - Invite code required',
      admin_approval: 'Application under review - Admin approval required'
    };
    
    content.push(colors.cyan(`Registration Mode: ${modeMessages[this.registrationMode]}`));
    content.push('');
    
    // Welcome message
    content.push(colors.yellow('Greetings, Future Commander!'));
    content.push('');
    content.push('Complete the following form to join the SpaceCommand fleet.');
    content.push('Your journey among the stars begins here!');
    content.push('');
    
    // Password strength indicator
    if (this.passwordStrength) {
      content.push(`Password Strength: ${this.passwordStrength}`);
      content.push('');
    }
    
    // Loading indicator
    if (this.isLoading) {
      content.push(colors.yellow('🔄 Processing registration request...'));
      content.push('');
    }
    
    // Form
    const formContent = await this.form.render();
    content.push(formContent);
    
    content.push('');
    content.push(colors.dim('─'.repeat(70)));
    content.push('');
    content.push(colors.dim('Security Requirements:'));
    content.push(colors.dim('• Password must be at least 12 characters'));
    content.push(colors.dim('• Mix of uppercase, lowercase, numbers, and symbols'));
    content.push(colors.dim('• Avoid common passwords'));
    content.push('');
    content.push(colors.cyan('Already have an account? Press L to login'));
    
    return this.window.render(content.join('\n'));
  }

  public async handleInput(key: string): Promise<ScreenTransition | null> {
    if (this.isLoading) {
      return null; // Ignore input while loading
    }

    // Handle form navigation and input
    const formResult = await this.form.handleInput(key);
    
    // Update password strength as user types
    if (formResult.data?.password) {
      this.passwordStrength = this.calculatePasswordStrength(formResult.data.password);
    }
    
    if (formResult.action === 'submit') {
      return this.handleRegistration(formResult.data);
    }
    
    if (formResult.action === 'cancel') {
      return { screen: 'login' };
    }
    
    // Handle special keys
    switch (key.toLowerCase()) {
      case 'l':
        return { screen: 'login' };
      
      case 'escape':
        return { screen: 'login' };
    }
    
    return null;
  }

  public async initialize(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = false;
    this.passwordStrength = '';
    this.form.reset();
    
    // TODO: Get registration mode from config/API
    this.registrationMode = 'open';
  }

  public async cleanup(): Promise<void> {
    this.form.reset();
  }

  private async handleRegistration(formData: any): Promise<ScreenTransition | null> {
    // Validate form data
    const validation = this.validateRegistrationData(formData);
    if (!validation.valid) {
      this.errorMessage = validation.errors.join('. ');
      return null;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    try {
      // TODO: Replace with actual API call
      const registrationData = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        inviteCode: formData.inviteCode || undefined
      };
      
      // Mock registration process
      await this.delay(2000); // Simulate network delay
      
      // Mock successful registration
      this.successMessage = 'Registration successful! Welcome to SpaceCommand, Commander!';
      this.isLoading = false;
      
      await this.delay(2000); // Show success message
      
      // Auto-login the new user (in real implementation, might redirect to email verification)
      return { 
        screen: 'universeSelection', 
        data: { 
          user: this.getMockUser(registrationData.email, registrationData.username),
          isNewUser: true
        } 
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      this.errorMessage = 'Registration failed. Please try again.';
      this.isLoading = false;
      return null;
    }
  }

  private validateRegistrationData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Email validation
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Valid email address required');
    }
    
    // Username validation
    if (!data.username || data.username.length < 3 || data.username.length > 50) {
      errors.push('Username must be 3-50 characters');
    }
    
    if (data.username && !/^[a-zA-Z0-9_-]+$/.test(data.username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }
    
    // Password validation
    if (!data.password || data.password.length < 12) {
      errors.push('Password must be at least 12 characters');
    }
    
    if (data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    const passwordStrength = this.calculatePasswordStrength(data.password);
    if (passwordStrength.includes('Weak')) {
      errors.push('Password is too weak. Use a mix of uppercase, lowercase, numbers, and symbols');
    }
    
    // Invite code validation (if registration mode requires it)
    if (this.registrationMode === 'invite' && !data.inviteCode) {
      errors.push('Invite code is required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private calculatePasswordStrength(password: string): string {
    if (!password) return '';
    
    let score = 0;
    const feedback: string[] = [];
    
    // Length scoring
    if (password.length >= 12) score += 20;
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;
    
    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    
    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('avoid repeating characters');
    }
    
    let strength: string;
    let color: (text: string) => string;
    
    if (score < 30) {
      strength = 'Weak';
      color = colors.red;
    } else if (score < 50) {
      strength = 'Fair';
      color = colors.yellow;
    } else if (score < 70) {
      strength = 'Good';
      color = colors.green;
    } else {
      strength = 'Strong';
      color = colors.green;
    }
    
    return color(`${strength} (${score}/100)`);
  }

  private getMockUser(email: string, username: string): any {
    return {
      id: 'mock-user-id-' + Date.now(),
      email: email,
      username: username,
      emailVerified: true, // In real implementation, would be false initially
      createdAt: new Date().toISOString(),
      profile: {
        displayName: `Commander ${username}`,
        bio: 'New recruit to the SpaceCommand fleet',
        favoriteFaction: 'independent'
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
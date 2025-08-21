import { Screen, ScreenTransition } from '../types';
import { Window } from '@modules/ux/components/Window';
import { Form } from '@modules/ux/components/Form';
import { colors } from '@modules/ux/utils/colors';

/**
 * Forgot password screen for password reset requests.
 * Allows users to request a password reset email.
 * Provides security feedback without revealing user information.
 */
export class ForgotPasswordScreen implements Screen {
  public readonly id = 'forgotPassword';
  public readonly title = 'Password Reset';
  
  private window: Window;
  private form: Form;
  private errorMessage: string = '';
  private successMessage: string = '';
  private isLoading: boolean = false;

  constructor() {
    this.window = new Window({
      title: 'PASSWORD RECOVERY SYSTEM',
      width: 70,
      height: 20,
      border: 'double',
      padding: 2
    });

    this.form = new Form({
      fields: [
        {
          id: 'email',
          label: 'Commander Email',
          type: 'email',
          required: true,
          placeholder: 'your-email@example.com'
        }
      ],
      submitLabel: 'SEND RECOVERY CODE',
      cancelLabel: 'BACK TO LOGIN'
    });
  }

  public async render(): Promise<string> {
    const content = [];
    
    // ASCII art header
    content.push(colors.yellow(`
    ╔═══════════════════════════════════════════════════╗
    ║             SECURITY RECOVERY SYSTEM              ║
    ║                PASSWORD RESET                     ║
    ╚═══════════════════════════════════════════════════╝
    `));
    
    content.push('');
    
    if (this.errorMessage) {
      content.push(colors.red(`⚠️  ERROR: ${this.errorMessage}`));
      content.push('');
    }
    
    if (this.successMessage) {
      content.push(colors.green(`✅ ${this.successMessage}`));
      content.push('');
      content.push(colors.dim('Please check your email for password reset instructions.'));
      content.push(colors.dim('The reset link will expire in 2 hours for security.'));
      content.push('');
    } else {
      // Instructions
      content.push(colors.cyan('Forgotten your security credentials, Commander?'));
      content.push('');
      content.push('Enter your registered email address and we\'ll send you');
      content.push('a secure link to reset your password.');
      content.push('');
    }
    
    // Loading indicator
    if (this.isLoading) {
      content.push(colors.yellow('🔄 Transmitting recovery request...'));
      content.push('');
    }
    
    if (!this.successMessage) {
      // Form
      const formContent = await this.form.render();
      content.push(formContent);
    }
    
    content.push('');
    content.push(colors.dim('─'.repeat(60)));
    content.push('');
    
    if (this.successMessage) {
      content.push(colors.cyan('Press any key to return to login'));
    } else {
      content.push(colors.dim('Security Note: For your protection, we\'ll send'));
      content.push(colors.dim('confirmation regardless of whether the email exists.'));
      content.push('');
      content.push(colors.cyan('Press ESC to return to login'));
    }
    
    return this.window.render(content.join('\n'));
  }

  public async handleInput(key: string): Promise<ScreenTransition | null> {
    if (this.successMessage) {
      // After success, any key returns to login
      return { screen: 'login' };
    }
    
    if (this.isLoading) {
      return null; // Ignore input while loading
    }

    // Handle form navigation and input
    const formResult = await this.form.handleInput(key);
    
    if (formResult.action === 'submit') {
      return this.handlePasswordReset(formResult.data);
    }
    
    if (formResult.action === 'cancel') {
      return { screen: 'login' };
    }
    
    // Handle special keys
    switch (key.toLowerCase()) {
      case 'escape':
        return { screen: 'login' };
    }
    
    return null;
  }

  public async initialize(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = false;
    this.form.reset();
  }

  public async cleanup(): Promise<void> {
    this.form.reset();
  }

  private async handlePasswordReset(formData: any): Promise<ScreenTransition | null> {
    // Validate email
    if (!formData.email || !this.isValidEmail(formData.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return null;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      // TODO: Replace with actual API call
      await this.delay(1500); // Simulate network delay
      
      // Always show success to prevent user enumeration
      this.successMessage = 'Password reset request sent successfully!';
      this.isLoading = false;
      
      return null; // Stay on screen to show success message
      
    } catch (error) {
      console.error('Password reset error:', error);
      this.errorMessage = 'Failed to send reset request. Please try again.';
      this.isLoading = false;
      return null;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
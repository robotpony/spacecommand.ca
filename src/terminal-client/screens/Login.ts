import { Screen, ScreenTransition } from '../types';
import { Window } from '@modules/ux/components/Window';
import { Form } from '@modules/ux/components/Form';
import { Text } from '@modules/ux/components/Text';
import { colors } from '@modules/ux/utils/colors';

/**
 * Login screen for user authentication.
 * Provides email/password login with "secure ship computer" option.
 * Integrates with authentication API for session management.
 */
export class LoginScreen implements Screen {
  public readonly id = 'login';
  public readonly title = 'Commander Authentication';
  
  private window: Window;
  private form: Form;
  private errorMessage: string = '';
  private isLoading: boolean = false;
  private authService: any; // Will be typed properly when API is connected

  constructor() {
    this.window = new Window({
      title: 'SPACECOMMAND AUTHENTICATION',
      width: 70,
      height: 25,
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
          placeholder: 'commander@example.com'
        },
        {
          id: 'password',
          label: 'Security Code',
          type: 'password',
          required: true,
          placeholder: '••••••••••••'
        },
        {
          id: 'secureShipComputer',
          label: 'Secure Ship Computer (Remember Me)',
          type: 'checkbox',
          required: false
        }
      ],
      submitLabel: 'ESTABLISH CONNECTION',
      cancelLabel: 'BACK TO MAIN MENU'
    });
  }

  public async render(): Promise<string> {
    const content = [];
    
    // ASCII art header
    content.push(colors.cyan(`
    ╔═══════════════════════════════════════════════════╗
    ║          SPACECOMMAND CENTRAL AUTHORITY           ║
    ║               SECURE LOGIN TERMINAL               ║
    ╚═══════════════════════════════════════════════════╝
    `));
    
    content.push('');
    
    if (this.errorMessage) {
      content.push(colors.red(`⚠️  ERROR: ${this.errorMessage}`));
      content.push('');
    }
    
    // Welcome message
    content.push(colors.green('Welcome back, Commander!'));
    content.push('');
    content.push('Enter your credentials to access the galactic network.');
    content.push('');
    
    // Loading indicator
    if (this.isLoading) {
      content.push(colors.yellow('🔄 Establishing secure connection...'));
      content.push('');
    }
    
    // Form
    const formContent = await this.form.render();
    content.push(formContent);
    
    content.push('');
    content.push(colors.dim('─'.repeat(60)));
    content.push('');
    content.push(colors.dim('New to SpaceCommand?'));
    content.push(colors.cyan('Press R to register a new commander account'));
    content.push('');
    content.push(colors.dim('Forgot your security code?'));
    content.push(colors.cyan('Press F to reset your password'));
    
    return this.window.render(content.join('\n'));
  }

  public async handleInput(key: string): Promise<ScreenTransition | null> {
    if (this.isLoading) {
      return null; // Ignore input while loading
    }

    // Handle form navigation and input
    const formResult = await this.form.handleInput(key);
    
    if (formResult.action === 'submit') {
      return this.handleLogin(formResult.data);
    }
    
    if (formResult.action === 'cancel') {
      return { screen: 'mainMenu' };
    }
    
    // Handle special keys
    switch (key.toLowerCase()) {
      case 'r':
        return { screen: 'register' };
      
      case 'f':
        return { screen: 'forgotPassword' };
      
      case 'escape':
        return { screen: 'mainMenu' };
    }
    
    return null;
  }

  public async initialize(): Promise<void> {
    this.errorMessage = '';
    this.isLoading = false;
    this.form.reset();
  }

  public async cleanup(): Promise<void> {
    this.form.reset();
  }

  private async handleLogin(formData: any): Promise<ScreenTransition | null> {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      // TODO: Replace with actual API call when connected
      const loginData = {
        email: formData.email,
        password: formData.password,
        secureShipComputer: formData.secureShipComputer || false
      };
      
      // Mock authentication for now
      if (this.isValidMockCredentials(loginData.email, loginData.password)) {
        // Mock successful login
        await this.delay(1500); // Simulate network delay
        
        // Store session info (mock)
        this.storeSessionMock(loginData);
        
        return { screen: 'universeSelection', data: { user: this.getMockUser(loginData.email) } };
      } else {
        // Mock failed login
        await this.delay(1000);
        this.errorMessage = 'Invalid credentials. Access denied.';
        this.isLoading = false;
        return null;
      }
      
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage = 'Connection failed. Please try again.';
      this.isLoading = false;
      return null;
    }
  }

  // Mock authentication methods (to be replaced with real API)
  private isValidMockCredentials(email: string, password: string): boolean {
    // Accept any email with password "password" for demo
    return password === 'password' && email.includes('@');
  }

  private storeSessionMock(loginData: any): void {
    // Mock session storage (in real implementation, token would come from API)
    const mockSession = {
      token: 'mock-jwt-token-' + Date.now(),
      user: this.getMockUser(loginData.email),
      isPersistent: loginData.secureShipComputer,
      loginTime: new Date().toISOString()
    };
    
    // In real implementation, store securely
    global.mockSession = mockSession;
  }

  private getMockUser(email: string): any {
    return {
      id: 'mock-user-id',
      email: email,
      username: email.split('@')[0],
      emailVerified: true,
      createdAt: new Date().toISOString(),
      profile: {
        displayName: `Commander ${email.split('@')[0]}`,
        favoriteFaction: 'terran_federation'
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
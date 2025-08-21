import { Screen, ScreenTransition } from '../types';
import { Window } from '@modules/ux/components/Window';
import { Menu } from '@modules/ux/components/Menu';
import { Text } from '@modules/ux/components/Text';
import { colors } from '@modules/ux/utils/colors';

/**
 * Main menu screen with authentication support.
 * Shows different options based on authentication state.
 * Serves as the entry point to the game or authentication flow.
 */
export class MainMenuAuth implements Screen {
  public readonly id = 'mainMenu';
  public readonly title = 'SpaceCommand Central';
  
  private window: Window;
  private menu: Menu;
  private isAuthenticated: boolean = false;
  private user: any = null;

  constructor() {
    this.window = new Window({
      title: 'SPACECOMMAND CENTRAL COMMAND',
      width: 80,
      height: 25,
      border: 'double',
      padding: 2
    });

    this.updateMenu();
  }

  public async render(): Promise<string> {
    const content = [];
    
    // ASCII art header
    content.push(colors.cyan(`
    ╔═══════════════════════════════════════════════════════════════════════╗
    ║                           SPACECOMMAND                                ║
    ║                    GALACTIC TRADE NETWORK                             ║
    ║                         CENTRAL HUB                                   ║
    ╚═══════════════════════════════════════════════════════════════════════╝
    `));
    
    content.push('');
    
    if (this.isAuthenticated && this.user) {
      // Authenticated user welcome
      content.push(colors.green(`Welcome back, ${this.user.profile?.displayName || this.user.username}!`));
      content.push(colors.dim(`Last login: ${new Date().toLocaleString()}`));
      content.push('');
      
      // Show user stats/status
      content.push(colors.yellow('Commander Status:'));
      content.push(colors.dim(`• Email: ${this.user.email} ${this.user.emailVerified ? colors.green('✓') : colors.red('⚠️')}`));
      content.push(colors.dim(`• Faction: ${this.user.profile?.favoriteFaction || 'Independent'}`));
      content.push(colors.dim(`• Member since: ${new Date(this.user.createdAt).toLocaleDateString()}`));
      content.push('');
    } else {
      // Unauthenticated welcome
      content.push(colors.yellow('Welcome to SpaceCommand!'));
      content.push('');
      content.push('Embark on an epic journey through the galaxy as a space trader,');
      content.push('building your fortune through interstellar commerce, diplomacy,');
      content.push('and strategic empire building.');
      content.push('');
      content.push(colors.green('To begin your adventure, please log in or create an account.'));
      content.push('');
    }
    
    // Menu
    const menuContent = await this.menu.render();
    content.push(menuContent);
    
    content.push('');
    
    if (!this.isAuthenticated) {
      content.push(colors.dim('─'.repeat(70)));
      content.push('');
      content.push(colors.dim('New to SpaceCommand? Join thousands of commanders exploring'));
      content.push(colors.dim('the galaxy in this turn-based multiplayer trading game!'));
    }
    
    return this.window.render(content.join('\n'));
  }

  public async handleInput(key: string): Promise<ScreenTransition | null> {
    const menuResult = await this.menu.handleInput(key);
    
    if (menuResult.selectedItem) {
      const action = menuResult.selectedItem.action;
      
      switch (action) {
        case 'login':
          return { screen: 'login' };
        
        case 'register':
          return { screen: 'register' };
        
        case 'play':
          if (this.isAuthenticated) {
            return { screen: 'universeSelection', data: { user: this.user } };
          }
          return { screen: 'login' };
        
        case 'profile':
          return { screen: 'userProfile', data: { user: this.user } };
        
        case 'logout':
          await this.handleLogout();
          return null;
        
        case 'about':
          return { screen: 'about' };
        
        case 'help':
          return { screen: 'help' };
        
        case 'quit':
          process.exit(0);
          
        default:
          return null;
      }
    }
    
    // Direct key handling
    switch (key.toLowerCase()) {
      case 'escape':
      case 'q':
        if (!this.isAuthenticated) {
          process.exit(0);
        }
        return null;
    }
    
    return null;
  }

  public async initialize(data?: any): Promise<void> {
    // Check if user is passed in (from successful login/registration)
    if (data?.user) {
      this.user = data.user;
      this.isAuthenticated = true;
    } else {
      // Check for existing session
      this.checkExistingSession();
    }
    
    this.updateMenu();
  }

  public async cleanup(): Promise<void> {
    // Nothing to clean up
  }

  private updateMenu(): void {
    const menuItems = [];

    if (this.isAuthenticated) {
      // Authenticated menu options
      menuItems.push(
        { 
          id: 'play', 
          label: 'ENTER GALAXY', 
          description: 'Choose universe and start playing',
          action: 'play'
        },
        { 
          id: 'profile', 
          label: 'COMMANDER PROFILE', 
          description: 'View and edit your profile',
          action: 'profile'
        },
        { 
          id: 'logout', 
          label: 'SECURE LOGOUT', 
          description: 'End session and return to login',
          action: 'logout'
        }
      );
    } else {
      // Unauthenticated menu options
      menuItems.push(
        { 
          id: 'login', 
          label: 'COMMANDER LOGIN', 
          description: 'Access your existing account',
          action: 'login'
        },
        { 
          id: 'register', 
          label: 'ENLIST AS COMMANDER', 
          description: 'Create a new commander account',
          action: 'register'
        }
      );
    }

    // Common menu options
    menuItems.push(
      { 
        id: 'about', 
        label: 'ABOUT SPACECOMMAND', 
        description: 'Learn about the game',
        action: 'about'
      },
      { 
        id: 'help', 
        label: 'HELP & TUTORIAL', 
        description: 'Get help and learn game basics',
        action: 'help'
      },
      { 
        id: 'quit', 
        label: 'EXIT TO TERMINAL', 
        description: 'Quit SpaceCommand',
        action: 'quit'
      }
    );

    this.menu = new Menu({
      items: menuItems,
      title: this.isAuthenticated ? 'Command Options' : 'Mission Control',
      selectedColor: 'highlight',
      keyStyle: 'brackets'
    });
  }

  private checkExistingSession(): void {
    // TODO: Check for stored session token and validate
    // For now, check mock session from global
    if ((global as any).mockSession) {
      this.user = (global as any).mockSession.user;
      this.isAuthenticated = true;
    }
  }

  private async handleLogout(): Promise<void> {
    // TODO: Call logout API to invalidate session
    
    // Clear local session
    this.user = null;
    this.isAuthenticated = false;
    
    // Clear mock session
    delete (global as any).mockSession;
    
    // Update menu
    this.updateMenu();
  }
}
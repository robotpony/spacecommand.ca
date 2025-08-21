import { Screen, ScreenTransition } from '../types';
import { MainMenuAuth } from './MainMenuAuth';
import { LoginScreen } from './Login';
import { RegisterScreen } from './Register';
import { ForgotPasswordScreen } from './ForgotPassword';
import { UniverseSelectionScreen } from './UniverseSelection';

// Import existing game screens (will be converted later)
import TitleScreen from './TitleScreen';
import TradeCenter from './TradeCenter';
import FleetOverview from './FleetOverview';
import GalaxyMap from './GalaxyMap';
import ActionQueue from './ActionQueue';
import DailyNewspaper from './DailyNewspaper';
import MarketOverview from './MarketOverview';

/**
 * Screen manager with authentication support.
 * Manages screen transitions, maintains game state, and handles user sessions.
 * Supports both old JavaScript screens and new TypeScript screens.
 */
export class ScreenManagerAuth {
  private screens: Map<string, Screen | any> = new Map();
  private currentScreenId: string = 'mainMenu';
  private currentScreen: Screen | any = null;
  private screenHistory: string[] = [];
  private gameState: any = {};
  private userSession: any = null;

  constructor() {
    this.initializeScreens();
    this.initializeGameState();
  }

  /**
   * Initializes all available screens.
   */
  private initializeScreens(): void {
    // New TypeScript authentication screens
    this.screens.set('mainMenu', new MainMenuAuth());
    this.screens.set('login', new LoginScreen());
    this.screens.set('register', new RegisterScreen());
    this.screens.set('forgotPassword', new ForgotPasswordScreen());
    
    // Universe and game screens
    this.screens.set('universeSelection', new UniverseSelectionScreen());
    
    // Legacy JavaScript screens (to be converted eventually)
    this.screens.set('title', new TitleScreen(null));
    this.screens.set('tradeCenter', new TradeCenter(null, this.gameState));
    this.screens.set('fleetOverview', new FleetOverview(null, this.gameState));
    this.screens.set('galaxyMap', new GalaxyMap(null, this.gameState));
    this.screens.set('actionQueue', new ActionQueue(null, this.gameState));
    this.screens.set('dailyNews', new DailyNewspaper(null, this.gameState));
    this.screens.set('marketOverview', new MarketOverview(null, this.gameState));
  }

  /**
   * Initializes default game state.
   */
  private initializeGameState(): void {
    this.gameState = {
      player: 'Commander',
      location: 'Sol System',
      currentSystem: 'Sol',
      credits: 10000, // Starting credits
      turn: 1,
      timeLeft: '2h 00m',
      actionPoints: { current: 10, max: 10 },
      messages: 0,
      fleet: { total: 1, trading: 0, idle: 1 },
      tradeProfit: 0,
      reputation: 'Neutral',
      alliance: 'Independent',
      ship: 'Scout Courier',
      cargoCapacity: { used: 0, total: 50 },
      stardate: '2387.01',
      playerRank: 1
    };
  }

  /**
   * Renders the current screen.
   */
  public async render(): Promise<string> {
    if (!this.currentScreen) {
      this.setScreen('mainMenu');
    }

    try {
      if (this.isNewTypeScriptScreen(this.currentScreen)) {
        return await this.currentScreen.render();
      } else {
        // Handle legacy JavaScript screens
        return this.currentScreen.render();
      }
    } catch (error) {
      console.error(`Error rendering screen ${this.currentScreenId}:`, error);
      return this.renderErrorScreen(error);
    }
  }

  /**
   * Handles user input for the current screen.
   */
  public async handleInput(key: string): Promise<void> {
    if (!this.currentScreen) return;

    try {
      let result: ScreenTransition | string | null = null;

      if (this.isNewTypeScriptScreen(this.currentScreen)) {
        result = await this.currentScreen.handleInput(key);
      } else {
        // Handle legacy JavaScript screens
        result = this.currentScreen.handleInput(key);
      }

      if (result) {
        await this.handleScreenTransition(result);
      }
    } catch (error) {
      console.error(`Error handling input for screen ${this.currentScreenId}:`, error);
    }
  }

  /**
   * Handles screen transitions.
   */
  private async handleScreenTransition(result: ScreenTransition | string): Promise<void> {
    let targetScreen: string;
    let data: any = null;

    if (typeof result === 'string') {
      // Legacy string result
      targetScreen = this.mapLegacyScreenName(result);
    } else {
      // New ScreenTransition object
      targetScreen = result.screen;
      data = result.data;
    }

    if (targetScreen === 'quit') {
      process.exit(0);
    }

    await this.setScreen(targetScreen, data);
  }

  /**
   * Maps legacy screen names to new screen IDs.
   */
  private mapLegacyScreenName(screenName: string): string {
    const mapping: Record<string, string> = {
      'trade-center': 'tradeCenter',
      'fleet-overview': 'fleetOverview',
      'galaxy-map': 'galaxyMap',
      'action-queue': 'actionQueue',
      'daily-news': 'dailyNews',
      'market-overview': 'marketOverview',
      'main-menu': 'mainMenu',
      'universe-selection': 'universeSelection'
    };

    return mapping[screenName] || screenName;
  }

  /**
   * Sets the current screen.
   */
  public async setScreen(screenId: string, data?: any): Promise<void> {
    // Add current screen to history
    if (this.currentScreenId && this.currentScreenId !== screenId) {
      this.screenHistory.push(this.currentScreenId);
    }

    const screen = this.screens.get(screenId);
    if (!screen) {
      console.error(`Screen not found: ${screenId}`);
      return;
    }

    // Cleanup current screen
    if (this.currentScreen && this.isNewTypeScriptScreen(this.currentScreen)) {
      await this.currentScreen.cleanup();
    }

    // Set new screen
    this.currentScreenId = screenId;
    this.currentScreen = screen;

    // Initialize new screen
    if (this.isNewTypeScriptScreen(this.currentScreen)) {
      await this.currentScreen.initialize(data);
    }

    // Update game state if user data is provided
    if (data?.user) {
      this.userSession = data.user;
      this.updateGameStateForUser(data.user);
    }
  }

  /**
   * Returns to the previous screen.
   */
  public async goBack(): Promise<void> {
    if (this.screenHistory.length > 0) {
      const previousScreen = this.screenHistory.pop()!;
      await this.setScreen(previousScreen);
    }
  }

  /**
   * Checks if screen is a new TypeScript screen.
   */
  private isNewTypeScriptScreen(screen: any): screen is Screen {
    return screen && typeof screen.initialize === 'function' && typeof screen.render === 'function';
  }

  /**
   * Updates game state when user logs in.
   */
  private updateGameStateForUser(user: any): void {
    this.gameState.player = user.profile?.displayName || user.username;
    this.gameState.alliance = user.profile?.favoriteFaction || 'Independent';
    
    // Reset new player state
    if (user.isNewUser) {
      this.gameState.credits = 10000;
      this.gameState.turn = 1;
      this.gameState.fleet = { total: 1, trading: 0, idle: 1 };
      this.gameState.tradeProfit = 0;
      this.gameState.messages = 1; // Welcome message
    }
  }

  /**
   * Renders error screen when screen rendering fails.
   */
  private renderErrorScreen(error: Error): string {
    return `
╔════════════════════════════════════════╗
║              SYSTEM ERROR              ║
╚════════════════════════════════════════╝

An error occurred while rendering the screen.

Error: ${error.message}

Press any key to return to main menu.
`;
  }

  /**
   * Gets current user session.
   */
  public getCurrentUser(): any {
    return this.userSession;
  }

  /**
   * Checks if user is authenticated.
   */
  public isAuthenticated(): boolean {
    return !!this.userSession;
  }

  /**
   * Gets current game state.
   */
  public getGameState(): any {
    return { ...this.gameState };
  }

  /**
   * Updates game state.
   */
  public updateGameState(updates: Partial<typeof this.gameState>): void {
    this.gameState = { ...this.gameState, ...updates };
  }

  /**
   * Logs out current user.
   */
  public async logout(): Promise<void> {
    this.userSession = null;
    this.initializeGameState();
    await this.setScreen('mainMenu');
  }
}
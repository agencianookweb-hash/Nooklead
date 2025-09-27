import { storage } from "./storage";
import type { MassCampaign, CampaignContact } from "@shared/schema";

// Types for the campaign engine
interface ContactData {
  id: string;
  phone: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  customData?: any;
}

interface SendResult {
  success: boolean;
  status: 'SENT' | 'FAILED';
  messageId?: string;
  error?: string;
  deliveryTime?: number;
}

interface WorkingHours {
  start: string; // "08:00"
  end: string;   // "18:00"
  timezone?: string;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
}

interface WhatsAppApiResponse {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed' | 'delivered' | 'read';
  error?: string;
  timestamp: Date;
}

// Campaign Engine class for managing mass campaign execution
export class CampaignEngine {
  private static instance: CampaignEngine;
  private runningCampaigns: Map<string, NodeJS.Timeout> = new Map();
  private campaignLocks: Map<string, boolean> = new Map(); // Mutex for preventing concurrent executions
  private campaignStates: Map<string, { 
    lastProcessedContact: number;
    isPaused: boolean;
    isStopped: boolean;
    lastExecutionTime?: number;
    executionCount?: number;
  }> = new Map();

  private constructor() {}

  public static getInstance(): CampaignEngine {
    if (!CampaignEngine.instance) {
      CampaignEngine.instance = new CampaignEngine();
    }
    return CampaignEngine.instance;
  }

  /**
   * Start campaign execution
   */
  async startCampaign(campaignId: string): Promise<void> {
    console.log(`[CampaignEngine] Starting campaign ${campaignId}`);
    
    try {
      // Get campaign data
      const campaign = await storage.getMassCampaignById(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Validate campaign can be started
      if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
        throw new Error(`Campaign ${campaignId} cannot be started. Current status: ${campaign.status}`);
      }

      // Get campaign contacts
      const contacts = await storage.getCampaignContacts(campaignId);
      if (contacts.length === 0) {
        throw new Error(`Campaign ${campaignId} has no contacts to process`);
      }

      // Update campaign status to RUNNING
      await storage.updateMassCampaign(campaignId, {
        status: 'RUNNING',
        startTime: new Date(),
        totalRecords: contacts.length,
        updatedAt: new Date()
      });

      // Log campaign start
      await storage.createCampaignLog({
        campaignId,
        eventType: 'RESUMED', // Using RESUMED for start since it's in the enum
        message: `Campaign started with ${contacts.length} contacts`,
        metadata: { totalContacts: contacts.length },

      });

      // Initialize campaign state
      this.campaignStates.set(campaignId, {
        lastProcessedContact: 0,
        isPaused: false,
        isStopped: false
      });

      // Start background worker
      await this.startWorker(campaignId);

    } catch (error) {
      console.error(`[CampaignEngine] Error starting campaign ${campaignId}:`, error);
      
      // Update campaign status to error and log
      await storage.updateMassCampaign(campaignId, {
        status: 'STOPPED',
        updatedAt: new Date()
      });

      await storage.createCampaignLog({
        campaignId,
        eventType: 'FAILED',
        message: `Failed to start campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,

      });

      throw error;
    }
  }

  /**
   * Pause campaign execution
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    console.log(`[CampaignEngine] Pausing campaign ${campaignId}`);
    
    const state = this.campaignStates.get(campaignId);
    if (state) {
      state.isPaused = true;
      this.campaignStates.set(campaignId, state);
    }

    // Stop the sequential scheduler
    this.cleanupCampaignScheduler(campaignId);

    // Update database status
    await storage.updateMassCampaign(campaignId, {
      status: 'PAUSED',
      updatedAt: new Date()
    });

    // Log pause event
    await storage.createCampaignLog({
      campaignId,
      eventType: 'PAUSED',
      message: 'Campaign execution paused by user'
    });
  }

  /**
   * Resume campaign execution
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    console.log(`[CampaignEngine] Resuming campaign ${campaignId}`);
    
    const campaign = await storage.getMassCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.status !== 'PAUSED') {
      throw new Error(`Campaign ${campaignId} cannot be resumed. Current status: ${campaign.status}`);
    }

    // Update campaign state
    const state = this.campaignStates.get(campaignId) || {
      lastProcessedContact: 0,
      isPaused: false,
      isStopped: false
    };
    state.isPaused = false;
    this.campaignStates.set(campaignId, state);

    // Update database status
    await storage.updateMassCampaign(campaignId, {
      status: 'RUNNING',
      updatedAt: new Date()
    });

    // Log resume event
    await storage.createCampaignLog({
      campaignId,
      eventType: 'RESUMED',
      message: 'Campaign execution resumed'
    });

    // Restart background worker
    await this.startWorker(campaignId);
  }

  /**
   * Stop campaign execution permanently
   */
  async stopCampaign(campaignId: string): Promise<void> {
    console.log(`[CampaignEngine] Stopping campaign ${campaignId}`);
    
    const state = this.campaignStates.get(campaignId);
    if (state) {
      state.isStopped = true;
      this.campaignStates.set(campaignId, state);
    }

    // Stop the sequential scheduler
    this.cleanupCampaignScheduler(campaignId);

    // Update database status
    await storage.updateMassCampaign(campaignId, {
      status: 'STOPPED',
      endTime: new Date(),
      updatedAt: new Date()
    });

    // Log stop event
    await storage.createCampaignLog({
      campaignId,
      eventType: 'STOPPED',
      message: 'Campaign execution stopped by user'
    });

    // Clean up state and resources
    this.campaignStates.delete(campaignId);
    this.campaignLocks.delete(campaignId);
  }

  /**
   * Start background worker for a campaign using sequential scheduler
   */
  private async startWorker(campaignId: string): Promise<void> {
    const campaign = await storage.getMassCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Calculate send delay based on rate limit
    const sendDelay = this.calculateSendDelay(campaign.sendRate || 50);
    console.log(`[CampaignEngine] Starting sequential scheduler for campaign ${campaignId} with ${sendDelay}ms delay between sends`);
    
    // Initialize mutex for this campaign
    this.campaignLocks.set(campaignId, false);
    
    // Initialize execution tracking
    const state = this.campaignStates.get(campaignId);
    if (state) {
      state.lastExecutionTime = Date.now();
      state.executionCount = 0;
      this.campaignStates.set(campaignId, state);
    }

    // Start sequential scheduler - NO setInterval, use recursive setTimeout
    const sequentialScheduler = async (): Promise<void> => {
      const executionStartTime = Date.now();
      
      try {
        // Check if campaign should still be running
        const currentState = this.campaignStates.get(campaignId);
        if (!currentState || currentState.isPaused || currentState.isStopped) {
          console.log(`[CampaignEngine] Sequential scheduler stopping for campaign ${campaignId} - paused/stopped`);
          this.cleanupCampaignScheduler(campaignId);
          return;
        }

        // Process one iteration with mutex protection
        await this.processCampaignWorker(campaignId);
        
        // Calculate actual execution time
        const executionTime = Date.now() - executionStartTime;
        const nextDelay = Math.max(sendDelay - executionTime, 1000); // Ensure at least 1s between executions
        
        // Update execution statistics
        if (currentState) {
          currentState.lastExecutionTime = Date.now();
          currentState.executionCount = (currentState.executionCount || 0) + 1;
          this.campaignStates.set(campaignId, currentState);
        }
        
        // Log timing for audit trail
        console.log(`[CampaignEngine] Campaign ${campaignId} execution #${currentState?.executionCount || 0} took ${executionTime}ms, next in ${nextDelay}ms`);
        
        // Schedule next execution ONLY after current one completes
        const timer = setTimeout(() => {
          sequentialScheduler().catch(async (error) => {
            console.error(`[CampaignEngine] Sequential scheduler error for campaign ${campaignId}:`, error);
            
            // Log error and stop scheduler
            await storage.createCampaignLog({
              campaignId,
              eventType: 'FAILED',
              message: `Sequential scheduler error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              metadata: { executionTime, scheduledDelay: sendDelay }
            });
            
            this.cleanupCampaignScheduler(campaignId);
          });
        }, nextDelay);
        
        // Store timer for cleanup
        this.runningCampaigns.set(campaignId, timer);
        
      } catch (error) {
        console.error(`[CampaignEngine] Sequential scheduler error for campaign ${campaignId}:`, error);
        
        // Log error and stop scheduler
        await storage.createCampaignLog({
          campaignId,
          eventType: 'FAILED',
          message: `Sequential scheduler error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metadata: { executionTime: Date.now() - executionStartTime }
        });
        
        this.cleanupCampaignScheduler(campaignId);
      }
    };

    // Start the sequential scheduler
    await sequentialScheduler();
  }

  /**
   * Main worker function that processes contacts sequentially with mutex protection
   */
  private async processCampaignWorker(campaignId: string): Promise<void> {
    // CRITICAL: Check mutex to prevent concurrent executions
    if (this.campaignLocks.get(campaignId)) {
      console.log(`[CampaignEngine] Campaign ${campaignId} is already executing, skipping to prevent overlap`);
      return;
    }
    
    // Acquire lock to prevent concurrent execution
    this.campaignLocks.set(campaignId, true);
    const processingStartTime = Date.now();
    
    try {
      const state = this.campaignStates.get(campaignId);
      if (!state) {
        console.log(`[CampaignEngine] No state found for campaign ${campaignId}, stopping worker`);
        this.stopWorker(campaignId);
        return;
      }

      // Check if campaign is paused or stopped
      if (state.isPaused || state.isStopped) {
        console.log(`[CampaignEngine] Campaign ${campaignId} is paused/stopped, skipping processing`);
        return;
      }

    const campaign = await storage.getMassCampaignById(campaignId);
    if (!campaign) {
      console.log(`[CampaignEngine] Campaign ${campaignId} not found, stopping worker`);
      this.stopWorker(campaignId);
      return;
    }

    // Check working hours
    if (campaign.workingHours && !this.isWithinWorkingHours(campaign.workingHours)) {
      console.log(`[CampaignEngine] Campaign ${campaignId} outside working hours, skipping`);
      return;
    }

    // Get contacts to process
    const contacts = await storage.getCampaignContacts(campaignId);
    if (contacts.length === 0) {
      console.log(`[CampaignEngine] No contacts found for campaign ${campaignId}`);
      await this.completeCampaign(campaignId);
      return;
    }

    // Find next contact to process
    const contactsToProcess = contacts.filter(contact => 
      contact.sendStatus === 'PENDING' && 
      contact.phoneValidationStatus !== 'BLACKLISTED'
    );

    if (contactsToProcess.length === 0) {
      console.log(`[CampaignEngine] All contacts processed for campaign ${campaignId}`);
      await this.completeCampaign(campaignId);
      return;
    }

    // Process next contact
    const nextContact = contactsToProcess[0];
    await this.processContact(campaignId, nextContact, campaign.messageTemplate || '');

    // Update state
    state.lastProcessedContact++;
    this.campaignStates.set(campaignId, state);
    
    } finally {
      // CRITICAL: Always release lock in finally block
      this.campaignLocks.set(campaignId, false);
      const processingTime = Date.now() - processingStartTime;
      console.log(`[CampaignEngine] Campaign ${campaignId} processing completed in ${processingTime}ms, lock released`);
    }
  }

  /**
   * Process a single contact
   */
  private async processContact(campaignId: string, contact: CampaignContact, template: string): Promise<void> {
    console.log(`[CampaignEngine] Processing contact ${contact.id} (${contact.phone}) for campaign ${campaignId}`);

    try {
      // Check blacklist
      const isBlacklisted = await storage.isPhoneBlacklisted(contact.phone || '');
      if (isBlacklisted) {
        console.log(`[CampaignEngine] Contact ${contact.phone} is blacklisted, skipping`);
        
        await storage.updateCampaignContact(contact.id, {
          sendStatus: 'FAILED',
          errorMessage: 'Phone number is blacklisted',
          sendTimestamp: new Date()
        });

        await storage.createCampaignLog({
          campaignId,
          contactId: contact.id,
          eventType: 'FAILED',
          message: `Contact skipped - blacklisted phone: ${contact.phone}`,
  
        });
        return;
      }

      // Validate WhatsApp (use cached validation if available)
      const validation = await storage.getCachedValidation(contact.phone || '');
      if (validation && validation.validationStatus === 'VALID_NO_WHATSAPP') {
        console.log(`[CampaignEngine] Contact ${contact.phone} does not have WhatsApp, skipping`);
        
        await storage.updateCampaignContact(contact.id, {
          sendStatus: 'FAILED',
          errorMessage: 'Phone number does not have WhatsApp',
          sendTimestamp: new Date()
        });

        await storage.createCampaignLog({
          campaignId,
          contactId: contact.id,
          eventType: 'FAILED',
          message: `Contact skipped - no WhatsApp: ${contact.phone}`,
  
        });
        return;
      }

      // Send message
      const contactData: ContactData = {
        id: contact.id,
        phone: contact.phone || '',
        razaoSocial: contact.razaoSocial || '',
        nomeFantasia: contact.nomeFantasia || '',
        customData: contact.customData
      };

      const result = await this.sendMessage(contactData, template);

      if (result.success) {
        // Update contact status to SENT
        await storage.updateCampaignContact(contact.id, {
          sendStatus: 'SENT',
          sendTimestamp: new Date(),
          errorMessage: null
        });

        // Log successful send
        await storage.createCampaignLog({
          campaignId,
          contactId: contact.id,
          eventType: 'SENT',
          message: `Message sent successfully to ${contact.phone}`,
          metadata: { messageId: result.messageId },
  
        });

        // Simulate delivery and read status updates
        setTimeout(async () => {
          await this.simulateStatusUpdates(campaignId, contact.id);
        }, Math.random() * 30000 + 10000); // 10-40 seconds delay

        // Update campaign sent count
        const campaign = await storage.getMassCampaignById(campaignId);
        if (campaign) {
          await storage.updateMassCampaign(campaignId, {
            sentCount: (campaign.sentCount || 0) + 1,
            successCount: (campaign.successCount || 0) + 1,
            updatedAt: new Date()
          });
        }

      } else {
        // Update contact status to FAILED
        await storage.updateCampaignContact(contact.id, {
          sendStatus: 'FAILED',
          sendTimestamp: new Date(),
          errorMessage: result.error || 'Unknown error'
        });

        // Log failed send
        await storage.createCampaignLog({
          campaignId,
          contactId: contact.id,
          eventType: 'FAILED',
          message: `Failed to send message to ${contact.phone}: ${result.error}`,
  
        });

        // Update campaign error count
        const campaign = await storage.getMassCampaignById(campaignId);
        if (campaign) {
          await storage.updateMassCampaign(campaignId, {
            errorCount: (campaign.errorCount || 0) + 1,
            updatedAt: new Date()
          });
        }
      }

    } catch (error) {
      console.error(`[CampaignEngine] Error processing contact ${contact.id}:`, error);
      
      await storage.updateCampaignContact(contact.id, {
        sendStatus: 'FAILED',
        sendTimestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      await storage.createCampaignLog({
        campaignId,
        contactId: contact.id,
        eventType: 'FAILED',
        message: `Error processing contact: ${error instanceof Error ? error.message : 'Unknown error'}`,

      });
    }
  }

  /**
   * Mock WhatsApp Business API send message
   */
  private async sendMessage(contact: ContactData, template: string): Promise<SendResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

    // Personalize message template
    let personalizedMessage = template;
    if (contact.razaoSocial) {
      personalizedMessage = personalizedMessage.replace(/\{razao_social\}/g, contact.razaoSocial);
    }
    if (contact.nomeFantasia) {
      personalizedMessage = personalizedMessage.replace(/\{nome_fantasia\}/g, contact.nomeFantasia);
    }

    // Mock WhatsApp API response (67% success rate as mentioned in requirements)
    const success = Math.random() < 0.67;
    
    if (success) {
      const messageId = `msg_${Math.random().toString(36).substring(2, 15)}`;
      return {
        success: true,
        status: 'SENT',
        messageId,
        deliveryTime: Math.random() * 1000 + 500
      };
    } else {
      // Simulate different types of errors
      const errors = [
        'Phone number not on WhatsApp',
        'Rate limit exceeded',
        'Invalid phone number format',
        'Message template validation failed',
        'Network timeout',
        'User blocked the business account'
      ];
      
      return {
        success: false,
        status: 'FAILED',
        error: errors[Math.floor(Math.random() * errors.length)]
      };
    }
  }

  /**
   * Simulate status updates (delivered, read) for sent messages
   */
  private async simulateStatusUpdates(campaignId: string, contactId: string): Promise<void> {
    try {
      // 80% chance of delivery
      if (Math.random() < 0.8) {
        await storage.updateCampaignContact(contactId, {
          sendStatus: 'DELIVERED',
          deliveryTimestamp: new Date()
        });

        await storage.createCampaignLog({
          campaignId,
          contactId,
          eventType: 'DELIVERED',
          message: 'Message delivered',
  
        });

        // 50% chance of being read (if delivered)
        setTimeout(async () => {
          if (Math.random() < 0.5) {
            try {
              await storage.updateCampaignContact(contactId, {
                sendStatus: 'READ',
                readTimestamp: new Date()
              });

              await storage.createCampaignLog({
                campaignId,
                contactId,
                eventType: 'READ',
                message: 'Message read',
        
              });
            } catch (error) {
              console.error(`[CampaignEngine] Error updating read status for contact ${contactId}:`, error);
            }
          }
        }, Math.random() * 60000 + 30000); // 30-90 seconds delay for read
      }
    } catch (error) {
      console.error(`[CampaignEngine] Error updating delivery status for contact ${contactId}:`, error);
    }
  }

  /**
   * Calculate delay between sends based on rate per hour
   */
  private calculateSendDelay(ratePerHour: number): number {
    if (ratePerHour <= 0) return 60000; // Default 1 minute if invalid rate
    
    // Convert rate per hour to delay in milliseconds
    const delayMs = (3600 * 1000) / ratePerHour;
    
    console.log(`[CampaignEngine] Rate: ${ratePerHour} msgs/hour = ${delayMs}ms delay between sends`);
    return Math.max(delayMs, 1000); // Minimum 1 second delay
  }

  /**
   * Check if current time is within working hours
   */
  private isWithinWorkingHours(workingHours: any): boolean {
    if (!workingHours || typeof workingHours !== 'object') {
      return true; // No restrictions if not configured
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;

    // Parse start and end times
    const startTime = workingHours.start || '08:00';
    const endTime = workingHours.end || '18:00';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startTimeInMinutes = startHour * 60 + startMin;
    const endTimeInMinutes = endHour * 60 + endMin;

    // Check day of week if configured
    if (workingHours.daysOfWeek && Array.isArray(workingHours.daysOfWeek)) {
      const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
      if (!workingHours.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Check time range
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
  }

  /**
   * Complete a campaign when all contacts are processed
   */
  private async completeCampaign(campaignId: string): Promise<void> {
    console.log(`[CampaignEngine] Completing campaign ${campaignId}`);

    // Stop worker
    this.stopWorker(campaignId);

    // Update campaign status
    await storage.updateMassCampaign(campaignId, {
      status: 'COMPLETED',
      endTime: new Date(),
      updatedAt: new Date()
    });

    // Log completion
    await storage.createCampaignLog({
      campaignId,
      eventType: 'RESUMED', // Using closest available enum value
      message: 'Campaign completed successfully'
    });

    // Clean up state
    this.campaignStates.delete(campaignId);
  }

  /**
   * Stop worker timer for a campaign and cleanup resources
   */
  private stopWorker(campaignId: string): void {
    this.cleanupCampaignScheduler(campaignId);
  }
  
  /**
   * Cleanup all resources for a campaign scheduler
   */
  private cleanupCampaignScheduler(campaignId: string): void {
    // Clear timer (setTimeout-based)
    const timer = this.runningCampaigns.get(campaignId);
    if (timer) {
      clearTimeout(timer); // Changed from clearInterval to clearTimeout
      this.runningCampaigns.delete(campaignId);
      console.log(`[CampaignEngine] Stopped sequential scheduler for campaign ${campaignId}`);
    }
    
    // Release mutex lock
    this.campaignLocks.set(campaignId, false);
    
    // Log cleanup for audit
    console.log(`[CampaignEngine] Cleaned up all resources for campaign ${campaignId}`);
  }

  /**
   * Get campaign state for monitoring
   */
  public getCampaignState(campaignId: string) {
    return this.campaignStates.get(campaignId);
  }

  /**
   * Get all running campaigns
   */
  public getRunningCampaigns(): string[] {
    return Array.from(this.runningCampaigns.keys());
  }
}

// Export singleton instance
export const campaignEngine = CampaignEngine.getInstance();
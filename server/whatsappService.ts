import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import QRCode from 'qrcode';
import { storage } from './storage';
import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';

export interface WhatsAppSession {
  userId: string;
  sessionId: string;
  client: Client;
  status: 'DISCONNECTED' | 'GENERATING_QR' | 'WAITING_QR' | 'CONNECTED' | 'ERROR';
  qrCode?: string;
  connectedPhone?: string;
  lastActivity: Date;
  errorMessage?: string;
}

class WhatsAppService extends EventEmitter {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private userSessions: Map<string, string> = new Map(); // userId -> sessionId
  private readonly QR_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes inactivity

  constructor() {
    super();
    this.setupCleanupInterval();
  }

  private setupCleanupInterval() {
    // Clean up expired QR codes and inactive sessions every minute
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 1000);
  }

  private async cleanupExpiredSessions() {
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      
      // Clean up expired QR codes
      if (session.status === 'WAITING_QR' && inactiveTime > this.QR_TIMEOUT) {
        await this.destroySession(sessionId, 'QR code expired');
      }
      
      // Clean up inactive sessions
      if (session.status === 'CONNECTED' && inactiveTime > this.SESSION_TIMEOUT) {
        await this.destroySession(sessionId, 'Session expired due to inactivity');
      }
    }
  }

  async generateQRCode(userId: string): Promise<{ sessionId: string; qrCode: string }> {
    try {
      // Disconnect any existing session for this user
      await this.disconnectUser(userId);
      
      const sessionId = nanoid();
      
      // Create WhatsApp client
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Create session object
      const session: WhatsAppSession = {
        userId,
        sessionId,
        client,
        status: 'GENERATING_QR',
        lastActivity: new Date()
      };

      // Store session
      this.sessions.set(sessionId, session);
      this.userSessions.set(userId, sessionId);

      // Save to database
      await storage.createWhatsappConnection({
        userId,
        sessionId,
        status: 'GENERATING_QR'
      });

      return new Promise((resolve, reject) => {
        let qrTimeout: NodeJS.Timeout;

        // Handle QR code generation
        client.on('qr', async (qr) => {
          try {
            console.log(`QR Code generated for user ${userId}`);
            
            // Generate QR code as base64 image
            const qrCodeDataUrl = await QRCode.toDataURL(qr, {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            // Update session
            session.status = 'WAITING_QR';
            session.qrCode = qrCodeDataUrl;
            session.lastActivity = new Date();

            // Update database
            await storage.updateWhatsappConnection(
              (await storage.getWhatsappConnection(userId))!.id,
              {
                status: 'WAITING_QR',
                qrCode: qrCodeDataUrl,
                qrCodeExpires: new Date(Date.now() + this.QR_TIMEOUT)
              }
            );

            // Emit status update
            this.emit('statusUpdate', {
              userId,
              sessionId,
              status: 'WAITING_QR',
              qrCode: qrCodeDataUrl
            });

            // Set QR timeout
            qrTimeout = setTimeout(async () => {
              await this.destroySession(sessionId, 'QR code expired');
              reject(new Error('QR code expired'));
            }, this.QR_TIMEOUT);

            resolve({ sessionId, qrCode: qrCodeDataUrl });
          } catch (error) {
            console.error('Error generating QR code:', error);
            await this.destroySession(sessionId, 'Failed to generate QR code');
            reject(error);
          }
        });

        // Handle successful authentication
        client.on('ready', async () => {
          try {
            clearTimeout(qrTimeout);
            console.log(`WhatsApp client ready for user ${userId}`);
            
            // Get phone number info
            const info = client.info;
            const phone = info?.wid?.user || 'Unknown';

            // Update session
            session.status = 'CONNECTED';
            session.connectedPhone = phone;
            session.lastActivity = new Date();
            session.qrCode = undefined; // Clear QR code

            // Update database
            await storage.updateWhatsappConnection(
              (await storage.getWhatsappConnection(userId))!.id,
              {
                status: 'CONNECTED',
                connectedPhone: phone,
                qrCode: null,
                qrCodeExpires: null,
                lastActivity: new Date(),
                connectionData: { clientId: sessionId } // Store encrypted session data
              }
            );

            // Emit status update
            this.emit('statusUpdate', {
              userId,
              sessionId,
              status: 'CONNECTED',
              connectedPhone: phone
            });

            console.log(`WhatsApp connected for user ${userId} with phone ${phone}`);
          } catch (error) {
            console.error('Error on WhatsApp ready:', error);
            await this.destroySession(sessionId, 'Failed to complete connection');
          }
        });

        // Handle authentication failure
        client.on('auth_failure', async (msg) => {
          clearTimeout(qrTimeout);
          console.log(`WhatsApp auth failure for user ${userId}:`, msg);
          await this.destroySession(sessionId, 'Authentication failed');
          reject(new Error('Authentication failed'));
        });

        // Handle disconnection
        client.on('disconnected', async (reason) => {
          console.log(`WhatsApp disconnected for user ${userId}:`, reason);
          await this.destroySession(sessionId, `Disconnected: ${reason}`);
        });

        // Initialize client
        client.initialize().catch(async (error) => {
          clearTimeout(qrTimeout);
          console.error('Error initializing WhatsApp client:', error);
          await this.destroySession(sessionId, 'Failed to initialize client');
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in generateQRCode:', error);
      throw error;
    }
  }

  async getConnectionStatus(userId: string): Promise<{
    status: string;
    sessionId?: string;
    connectedPhone?: string;
    qrCode?: string;
    lastActivity?: Date;
    errorMessage?: string;
  }> {
    const sessionId = this.userSessions.get(userId);
    
    if (!sessionId) {
      return { status: 'DISCONNECTED' };
    }

    const session = this.sessions.get(sessionId);
    
    if (!session) {
      // Check database for persistent connection
      const dbConnection = await storage.getActiveWhatsappConnection(userId);
      if (dbConnection) {
        return {
          status: dbConnection.status,
          sessionId: dbConnection.sessionId || undefined,
          connectedPhone: dbConnection.connectedPhone || undefined,
          lastActivity: dbConnection.lastActivity || undefined
        };
      }
      return { status: 'DISCONNECTED' };
    }

    // Update last activity
    session.lastActivity = new Date();

    return {
      status: session.status,
      sessionId: session.sessionId,
      connectedPhone: session.connectedPhone,
      qrCode: session.qrCode,
      lastActivity: session.lastActivity,
      errorMessage: session.errorMessage
    };
  }

  async disconnectUser(userId: string): Promise<void> {
    const sessionId = this.userSessions.get(userId);
    
    if (sessionId) {
      await this.destroySession(sessionId, 'User requested disconnection');
    }

    // Also update database
    const dbConnection = await storage.getWhatsappConnection(userId);
    if (dbConnection) {
      await storage.updateWhatsappConnection(dbConnection.id, {
        status: 'DISCONNECTED',
        qrCode: null,
        qrCodeExpires: null,
        lastActivity: new Date()
      });
    }
  }

  private async destroySession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      try {
        // Destroy WhatsApp client
        if (session.client) {
          await session.client.destroy();
        }
      } catch (error) {
        console.error('Error destroying WhatsApp client:', error);
      }

      // Update session status
      session.status = 'DISCONNECTED';
      session.errorMessage = reason;

      // Remove from maps
      this.sessions.delete(sessionId);
      this.userSessions.delete(session.userId);

      // Update database
      const dbConnection = await storage.getWhatsappConnection(session.userId);
      if (dbConnection) {
        await storage.updateWhatsappConnection(dbConnection.id, {
          status: 'DISCONNECTED',
          errorMessage: reason,
          qrCode: null,
          qrCodeExpires: null,
          lastActivity: new Date()
        });
      }

      // Emit status update
      this.emit('statusUpdate', {
        userId: session.userId,
        sessionId,
        status: 'DISCONNECTED',
        errorMessage: reason
      });

      console.log(`Session ${sessionId} destroyed: ${reason}`);
    }
  }

  async sendMessage(userId: string, phone: string, message: string): Promise<void> {
    const sessionId = this.userSessions.get(userId);
    
    if (!sessionId) {
      throw new Error('No active WhatsApp session');
    }

    const session = this.sessions.get(sessionId);
    
    if (!session || session.status !== 'CONNECTED') {
      throw new Error('WhatsApp not connected');
    }

    try {
      // Format phone number for WhatsApp
      const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
      
      // Send message
      await session.client.sendMessage(formattedPhone, message);
      
      // Update last activity
      session.lastActivity = new Date();
      
      console.log(`Message sent from user ${userId} to ${phone}`);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw new Error('Failed to send message');
    }
  }

  async isUserConnected(userId: string): Promise<boolean> {
    const sessionId = this.userSessions.get(userId);
    
    if (!sessionId) {
      // Check database for active connection
      const dbConnection = await storage.getActiveWhatsappConnection(userId);
      return dbConnection?.status === 'CONNECTED';
    }

    const session = this.sessions.get(sessionId);
    return session?.status === 'CONNECTED' || false;
  }

  // Get all connected users (for admin purposes)
  getConnectedUsers(): string[] {
    const connectedUsers: string[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.status === 'CONNECTED') {
        connectedUsers.push(session.userId);
      }
    }
    
    return connectedUsers;
  }

  // Get session count (for monitoring)
  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Create singleton instance
export const whatsappService = new WhatsAppService();

// Export types
export type { WhatsAppSession };
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Em desenvolvimento, permite rodar sem DATABASE_URL (com aviso)
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  DATABASE_URL not set. Server will start but database features will not work.');
    console.warn('⚠️  Create a .env file with DATABASE_URL to enable database features.');
  } else {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
}

// Cria pool e db apenas se DATABASE_URL estiver definido
export const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null as any;

export const db = process.env.DATABASE_URL
  ? drizzle({ client: pool, schema })
  : null as any;
export interface IntegrationConnectionContext {
  organisationId: string;
  plantId?: string;
}

export interface NotificationMessage {
  to: string;
  templateKey: string;
  variables: Record<string, string>;
}

export interface NotificationAdapter {
  send(context: IntegrationConnectionContext, message: NotificationMessage): Promise<void>;
}

export interface MapProviderAdapter {
  estimateDistanceKm(origin: string, destination: string): Promise<number>;
}

export interface WeighbridgeReading {
  deviceId: string;
  readingId: string;
  weightKg: number;
  capturedAt: string;
  signature: string;
}


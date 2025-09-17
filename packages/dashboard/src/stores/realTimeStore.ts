import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface WebSocketMessage {
  type: 'metrics' | 'event' | 'alert' | 'heartbeat';
  data: any;
  timestamp: Date;
}

interface RealTimeState {
  // WebSocket Connection
  ws: WebSocket | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Message Queue
  messageQueue: WebSocketMessage[];
  maxQueueSize: number;
  
  // Subscription Management
  subscriptions: Set<string>;
  
  // Connection Configuration
  url: string | null;
  autoReconnect: boolean;
  heartbeatInterval: number;
  
  // Actions
  connect: (url: string) => void;
  disconnect: () => void;
  send: (message: any) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  addMessage: (message: WebSocketMessage) => void;
  clearMessages: () => void;
  setConnectionState: (state: RealTimeState['connectionState']) => void;
}

export const useRealTimeStore = create<RealTimeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    ws: null,
    connectionState: 'disconnected',
    lastHeartbeat: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    
    messageQueue: [],
    maxQueueSize: 1000,
    
    subscriptions: new Set(),
    
    url: null,
    autoReconnect: true,
    heartbeatInterval: 30000, // 30 seconds
    
    // Actions
    connect: (url) => {
      const state = get();
      
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.disconnect();
      }
      
      set({ 
        url, 
        connectionState: 'connecting',
        reconnectAttempts: 0 
      });
      
      try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          set({ 
            ws, 
            connectionState: 'connected',
            lastHeartbeat: new Date(),
            reconnectAttempts: 0
          });
          
          // Subscribe to all active subscriptions
          const currentState = get();
          currentState.subscriptions.forEach(topic => {
            ws.send(JSON.stringify({
              type: 'subscribe',
              topic: topic
            }));
          });
          
          // Start heartbeat
          const heartbeatTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            } else {
              clearInterval(heartbeatTimer);
            }
          }, currentState.heartbeatInterval);
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const wsMessage: WebSocketMessage = {
              type: message.type,
              data: message.data || message,
              timestamp: new Date()
            };
            
            if (message.type === 'pong') {
              set({ lastHeartbeat: new Date() });
            } else {
              get().addMessage(wsMessage);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        ws.onclose = () => {
          set({ 
            connectionState: 'disconnected',
            ws: null 
          });
          
          // Auto-reconnect if enabled
          const currentState = get();
          if (currentState.autoReconnect && 
              currentState.reconnectAttempts < currentState.maxReconnectAttempts) {
            
            const delay = Math.min(1000 * Math.pow(2, currentState.reconnectAttempts), 30000);
            
            setTimeout(() => {
              const state = get();
              set({ 
                connectionState: 'reconnecting',
                reconnectAttempts: state.reconnectAttempts + 1
              });
              
              if (state.url) {
                state.connect(state.url);
              }
            }, delay);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          set({ connectionState: 'disconnected' });
        };
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        set({ connectionState: 'disconnected' });
      }
    },
    
    disconnect: () => {
      const { ws } = get();
      if (ws) {
        ws.close();
      }
      set({ 
        ws: null, 
        connectionState: 'disconnected',
        autoReconnect: false
      });
    },
    
    send: (message) => {
      const { ws } = get();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else {
        console.warn('WebSocket not connected, message not sent:', message);
      }
    },
    
    subscribe: (topic) => {
      set((state) => ({
        subscriptions: new Set([...state.subscriptions, topic])
      }));
      
      const { ws } = get();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          topic: topic
        }));
      }
    },
    
    unsubscribe: (topic) => {
      set((state) => {
        const newSubscriptions = new Set(state.subscriptions);
        newSubscriptions.delete(topic);
        return { subscriptions: newSubscriptions };
      });
      
      const { ws } = get();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          topic: topic
        }));
      }
    },
    
    addMessage: (message) => {
      set((state) => ({
        messageQueue: [message, ...state.messageQueue]
          .slice(0, state.maxQueueSize)
      }));
    },
    
    clearMessages: () => {
      set({ messageQueue: [] });
    },
    
    setConnectionState: (connectionState) => {
      set({ connectionState });
    }
  }))
);

// Selectors
export const selectIsConnected = (state: RealTimeState) => 
  state.connectionState === 'connected';

export const selectRecentMessages = (state: RealTimeState, count: number = 50) =>
  state.messageQueue.slice(0, count);

export const selectMessagesByType = (state: RealTimeState, type: WebSocketMessage['type']) =>
  state.messageQueue.filter(message => message.type === type);

export const selectConnectionHealth = (state: RealTimeState) => {
  const now = new Date();
  const lastHeartbeat = state.lastHeartbeat;
  
  if (!lastHeartbeat) {
    return 'unknown';
  }
  
  const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
  
  if (timeSinceHeartbeat > state.heartbeatInterval * 2) {
    return 'unhealthy';
  } else if (timeSinceHeartbeat > state.heartbeatInterval * 1.5) {
    return 'warning';
  }
  
  return 'healthy';
};
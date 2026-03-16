import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../environments/environment';

export type Team = 'A' | 'B';

export interface TeamMember {
  id: string;
  name: string;
}

export interface GameState {
    buzzEnabled: boolean;
    current: null | {
        team: Team;
        name: string;
        responderId: string;
        turnEndsAt: number;
    duration?: number;
    };
    scores: { A: number; B: number };
  timerDuration: number;
  teams: {
    A: TeamMember[];
    B: TeamMember[];
  };
    serverTime: number;
}

@Injectable({ providedIn: 'root' })
export class WsService {
  private socket?: Socket;
    private reconnectTimer?: any;
  private pendingRegistration: (() => void) | null = null;
  private registeredRole: 'manager' | 'player' | null = null;
  private registeredTeam?: 'A' | 'B';
  private registeredName?: string;

    readonly connected$ = new BehaviorSubject<boolean>(false);
    readonly state$ = new BehaviorSubject<GameState>({
        buzzEnabled: false,
        current: null,
        scores: { A: 0, B: 0 },
    timerDuration: 10,
    teams: { A: [], B: [] },
        serverTime: Date.now(),
    });

    readonly myId$ = new BehaviorSubject<string | null>(null);
    readonly events$ = new Subject<any>();

    constructor(private zone: NgZone) { }

    connect() {
    if (this.socket?.connected) return;

    this.socket = io(environment.wsUrl, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.zone.run(() => {
        this.connected$.next(true);
        // Auto-register if we have pending registration or need to re-register
        if (this.pendingRegistration) {
          this.pendingRegistration();
          this.pendingRegistration = null;
        } else if (this.registeredRole) {
          // Re-register on reconnect
          if (this.registeredRole === 'manager') {
            this.send({ type: 'REGISTER', role: 'manager' });
          } else if (this.registeredRole === 'player' && this.registeredTeam && this.registeredName) {
            this.send({ type: 'REGISTER', role: 'player', team: this.registeredTeam, name: this.registeredName });
          }
        }
      });
    });

    this.socket.on('disconnect', () => {
      this.zone.run(() => {
            this.connected$.next(false);
            this.scheduleReconnect();
      });
        });

    this.socket.on('connect_error', () => {
      this.zone.run(() => {
            this.connected$.next(false);
            this.scheduleReconnect();
        });
    });

    this.socket.on('HELLO', (data: { id: string }) => {
      this.zone.run(() => this.myId$.next(data.id));
    });

    this.socket.on('STATE', (data: GameState) => {
      this.zone.run(() => this.state$.next(data));
    });

    this.socket.onAny((event, data) => {
      this.zone.run(() => this.events$.next({ type: event, data }));
            });
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.connect();
    }, 2000);
    }

    send(obj: any) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send:', obj);
      return false;
    }
    console.log('Sending message:', obj);
    this.socket.emit('message', obj);
    return true;
    }

    registerManager() {
    this.registeredRole = 'manager';
    this.registeredTeam = undefined;
    this.registeredName = undefined;
    
    if (this.socket?.connected) {
      this.send({ type: 'REGISTER', role: 'manager' });
    } else {
      // Store registration to execute when connected
      this.pendingRegistration = () => {
        this.send({ type: 'REGISTER', role: 'manager' });
      };
    }
    }

    registerPlayer(team: 'A' | 'B', name: string) {
    this.registeredRole = 'player';
    this.registeredTeam = team;
    this.registeredName = name;
    
    if (this.socket?.connected) {
      this.send({ type: 'REGISTER', role: 'player', team, name });
    } else {
      // Store registration to execute when connected
      this.pendingRegistration = () => {
        this.send({ type: 'REGISTER', role: 'player', team, name });
      };
    }
    }

    buzz() {
        this.send({ type: 'BUZZ' });
    }

    managerCmd(cmd: string, extra: any = {}) {
    const msg = { type: 'MANAGER_CMD', cmd, ...extra };
    console.log('Sending manager command:', msg, 'Connected:', this.socket?.connected);
    this.send(msg);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    }
}

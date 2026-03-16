import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WsService } from '../../app/ws.service';

@Component({
  standalone: true,
  selector: 'app-manager',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css']
})
export class ManagerComponent {
  connected = signal(false);
  state = signal(this.ws.state$.value);
  now = signal(Date.now());
  timerDuration = signal(10);


  timeLeft = computed(() => {
    const c = this.state().current;
    if (!c) return 0;
    const ms = c.turnEndsAt - this.now();
    return Math.max(0, Math.ceil(ms / 1000));
  });

  private timer?: any;

  constructor(private ws: WsService) {
    this.ws.connect();
    this.ws.registerManager();

    this.ws.connected$.subscribe(v => this.connected.set(v));
    this.ws.state$.subscribe(s => {
      this.state.set(s);
      this.timerDuration.set(s.timerDuration || 10);
    });

    effect(() => {
      const active = !!this.state().current;
      if (active && !this.timer) {
        this.timer = setInterval(() => this.now.set(Date.now()), 200);
      }
      if (!active && this.timer) {
        clearInterval(this.timer);
        this.timer = undefined;
        this.now.set(Date.now());
      }
    });
  }

  enableBuzz() {
    console.log('Enable Buzz clicked, connected:', this.connected());
    if (!this.connected()) {
      alert('Not connected to server. Please wait for connection.');
      return;
    }
    this.ws.managerCmd('ENABLE_BUZZ');
  }

  reset() {
    this.ws.managerCmd('RESET_ROUND');
  }

  correct() {
    this.ws.managerCmd('MARK_CORRECT');
  }

  wrong() {
    this.ws.managerCmd('MARK_WRONG');
  }

  setScore(team: 'A' | 'B', value: number) {
    this.ws.managerCmd('SET_SCORE', { team, value });
  }

  setTimer() {
    const duration = this.timerDuration();
    if (duration > 0 && duration <= 300) {
      this.ws.managerCmd('SET_TIMER', { duration });
    }
  }

  getTeamMembers(team: 'A' | 'B') {
    return this.state().teams[team] || [];
  }

  getPlayerUrl(team: 'A' | 'B', name: string) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/player?team=${team}&name=${encodeURIComponent(name)}`;
  }
}

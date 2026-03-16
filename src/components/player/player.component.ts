import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WsService } from '../../app/ws.service';

@Component({
  standalone: true,
  selector: 'app-player',
  imports: [CommonModule, FormsModule],
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements OnInit, OnDestroy {
  connected = signal(false);
  state = signal(this.ws.state$.value);
  myId = signal<string | null>(null);

  team = signal<'A' | 'B'>('A');
  name = signal('');
  isRegistered = signal(false);

  now = signal(Date.now());
  private timer?: any;

  timeLeft = computed(() => {
    const c = this.state().current;
    if (!c) return 0;
    const ms = c.turnEndsAt - this.now();
    return Math.max(0, Math.ceil(ms / 1000));
  });

  // Calculate progress percentage for circular indicator
  timeProgress = computed(() => {
    const c = this.state().current;
    if (!c || !c.duration) return 0;
    const elapsed = (c.duration * 1000) - (c.turnEndsAt - this.now());
    const progress = Math.max(0, Math.min(100, (elapsed / (c.duration * 1000)) * 100));
    return progress;
  });

  // Get total duration for current turn
  totalDuration = computed(() => {
    const c = this.state().current;
    return c?.duration || this.state().timerDuration || 10;
  });

  // SVG circle circumference (2 * PI * radius)
  circumference = computed(() => {
    return 2 * Math.PI * 156;
  });

  getProgressOffset(): number {
    const progress = this.timeProgress();
    return this.circumference() - (progress / 100) * this.circumference();
  }

  getProgressColor(): string {
    const progress = this.timeProgress();
    if (progress < 33) {
      return '#4caf50'; // Green
    } else if (progress < 66) {
      return '#ff9800'; // Orange
    } else {
      return '#f44336'; // Red
    }
  }

  isMeResponding = computed(() => {
    const c = this.state().current;
    return !!c && !!this.myId() && c.responderId === this.myId();
  });

  canBuzz = computed(() => {
    const s = this.state();
    return this.connected() && this.isRegistered() && s.buzzEnabled && !s.current;
  });

  // Check if current turn is from player's team
  isMyTeamTurn = computed(() => {
    const c = this.state().current;
    return !!c && c.team === this.team();
  });

  // Get background class based on game state
  backgroundClass = computed(() => {
    const s = this.state();
    const c = s.current;
    
    if (c) {
      if (c.team === this.team()) {
        // Player's team is answering
        return this.team() === 'A' ? 'bg-team-a-active' : 'bg-team-b-active';
      } else {
        // Other team is answering
        return c.team === 'A' ? 'bg-team-a-other' : 'bg-team-b-other';
      }
    }
    
    if (s.buzzEnabled) {
      // Buzz is enabled - ready state
      return 'bg-ready';
    }
    
    // Default/waiting state
    return 'bg-default';
  });

  constructor(
    private ws: WsService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Check for query params (for direct links)
    const teamParam = this.route.snapshot.queryParamMap.get('team');
    const nameParam = this.route.snapshot.queryParamMap.get('name');
    
    if (teamParam && nameParam) {
      this.team.set(teamParam.toUpperCase() === 'B' ? 'B' : 'A');
      this.name.set(nameParam);
      this.isRegistered.set(true);
    }

    this.ws.connect();

    this.ws.connected$.subscribe(v => {
      this.connected.set(v);
      if (v && this.isRegistered()) {
        this.register();
      }
    });
    
    this.ws.state$.subscribe(s => this.state.set(s));
    this.ws.myId$.subscribe(id => this.myId.set(id));

    // Local tick for countdown
    this.timer = setInterval(() => this.now.set(Date.now()), 200);
  }

  ngOnInit() {
    // If already registered from query params, register immediately
    if (this.isRegistered() && this.connected()) {
      this.register();
    }
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  register() {
    if (!this.name().trim() || !this.team()) {
      return;
    }
    
    this.isRegistered.set(true);
    this.ws.registerPlayer(this.team(), this.name().trim());
    
    // Update URL without reload
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { team: this.team(), name: this.name().trim() },
      replaceUrl: true
    });
  }

  buzz() {
    if (!this.canBuzz()) return;
    this.ws.buzz();
  }
}

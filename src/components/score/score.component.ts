import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WsService } from '../../app/ws.service';

@Component({
  standalone: true,
  selector: 'app-score',
  imports: [CommonModule],
  templateUrl: './score.component.html',
  styleUrls: ['./score.component.css']
})
export class ScoreComponent {
  connected = signal(false);
  state = signal(this.ws.state$.value);

  constructor(private ws: WsService) {
    this.ws.connect();
    // Don't register as manager or player, just observe

    this.ws.connected$.subscribe(v => this.connected.set(v));
    this.ws.state$.subscribe(s => this.state.set(s));
  }
}


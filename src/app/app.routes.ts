import { Routes } from '@angular/router';
import { ManagerComponent } from '../components/manager/manager.component';
import { PlayerComponent } from '../components/player/player.component';
import { ScoreComponent } from '../components/score/score.component';

export const routes: Routes = [
    { path: 'manager', component: ManagerComponent },
    { path: 'player', component: PlayerComponent },
    { path: 'score', component: ScoreComponent },
    { path: '', pathMatch: 'full', redirectTo: 'manager' },
];

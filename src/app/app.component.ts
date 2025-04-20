import { Component } from '@angular/core';
import {
  IonApp, IonAvatar, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonGrid,
  IonHeader,
  IonRouterOutlet,
  IonSearchbar,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, HttpClientModule],
  standalone: true,
})
export class AppComponent {
  constructor() {}
}

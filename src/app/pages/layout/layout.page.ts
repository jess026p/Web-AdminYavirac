import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { addIcons } from 'ionicons';
import { homeOutline, personOutline, locationOutline } from 'ionicons/icons';

addIcons({
  'home-outline': homeOutline,
  'person-outline': personOutline,
  'location-outline': locationOutline
});

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
})
export class LayoutPage {}

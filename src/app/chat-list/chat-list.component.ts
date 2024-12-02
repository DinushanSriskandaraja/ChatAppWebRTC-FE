import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebRTCService } from '../service/web-rtc.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.css'], // Fixed 'styleUrl' to 'styleUrls'
})
export class ChatListComponent implements OnInit, OnDestroy {
  onlineUsers: { id: string; name: string }[] = [];
  private webrtcService = inject(WebRTCService);
  private onlineUsersSub!: Subscription;
  constructor(private router: Router) {} // Inject Router

  ngOnInit() {
    // Generate a unique name for the user
    const userName = `User-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    console.log('Emitting join event for user:', userName);
    this.webrtcService.join(userName);

    this.onlineUsersSub = this.webrtcService.onlineUsers$.subscribe((users) => {
      console.log('Received online users list:', users); // Check for usernames in the log
      this.onlineUsers = users;
    });
  }

  startChat(user: { id: string; name: string }) {
    if (user && user.id && user.name) {
      // Use query parameters for navigation
      this.router.navigate(['chat'], {
        queryParams: { id: user.id, name: user.name },
      });
      console.error('Navigating to chat with user:', user);
    } else {
      console.error('User ID or Name is missing or undefined!');
    }
  }

  ngOnDestroy() {
    if (this.onlineUsersSub) {
      this.onlineUsersSub.unsubscribe();
    }
  }
}

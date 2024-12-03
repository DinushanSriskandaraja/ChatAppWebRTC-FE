import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { WebRTCService } from '../service/web-rtc.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TyperComponent } from '../typer/typer.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [TyperComponent, CommonModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: { from: string; text: string }[] = [];
  otherUserName: string = 'Unknown User';
  private userId: string = '';
  private messagesSub: Subscription | null = null;
  private webrtcService = inject(WebRTCService);
  private route = inject(ActivatedRoute);
  userName: string = '';

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.userId = params['id'];
      this.otherUserName = params['id'] || `User ${this.userId}`;

      if (!this.userId) {
        console.error('User ID is missing in query parameters!');
        return;
      }

      console.log(
        `Starting chat with ${this.otherUserName} (ID: ${this.userId})`
      );

      // Connect to the target user
      this.webrtcService.connectToUser(this.userId);

      // Subscribe to the incoming messages
      this.messagesSub = this.webrtcService.messages$.subscribe((messages) => {
        this.messages = messages;
      });
    });
  }

  onSendMessage(message: string) {
    if (message.trim()) {
      console.log('Sending message to user:', message);
      this.webrtcService.sendMessage(this.userId, message);

      this.messages.push({ from: 'You', text: message });
    }
  }
  joinChat() {
    this.webrtcService.join(this.userName); // Emit 'join' event to the backend
  }

  ngOnDestroy() {
    if (this.messagesSub) {
      this.messagesSub.unsubscribe();
    }
  }
}

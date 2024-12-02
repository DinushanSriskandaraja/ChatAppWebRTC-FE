import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { TyperComponent } from '../typer/typer.component';
import { MessageComponent } from '../message/message.component';
import { FormsModule } from '@angular/forms';
import { WebRTCService } from '../service/web-rtc.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [TyperComponent, FormsModule, CommonModule],
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
      // Send the message to the other user
      this.webrtcService.sendMessage(this.userId, message);

      // Add the message to the local chat history
      this.messages.push({ from: 'You', text: message });
    }
  }

  ngOnDestroy() {
    // Clean up subscriptions to prevent memory leaks
    if (this.messagesSub) {
      console.log('Unsubscribing from message subscription.');
      this.messagesSub.unsubscribe();
    } else {
      console.warn('No active subscription found to unsubscribe.');
    }
  }
}

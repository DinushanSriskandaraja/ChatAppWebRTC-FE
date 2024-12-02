import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebRTCService {
  private onlineUsersSubject = new BehaviorSubject<
    { id: string; name: string }[]
  >([]);
  onlineUsers$ = this.onlineUsersSubject.asObservable();

  constructor() {
    // Mock some online users initially
    this.onlineUsersSubject.next([
      { id: '1', name: 'User 1' },
      { id: '2', name: 'User 2' },
    ]);
  }

  addUser(user: { id: string; name: string }) {
    const users = [...this.onlineUsersSubject.value, user];
    this.onlineUsersSubject.next(users);
  }

  removeUser(userId: string) {
    const users = this.onlineUsersSubject.value.filter(
      (user) => user.id !== userId
    );
    this.onlineUsersSubject.next(users);
  }
}

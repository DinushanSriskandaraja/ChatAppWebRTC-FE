import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-typer',
  standalone: true,
  templateUrl: './typer.component.html',
  styleUrls: ['./typer.component.css'],
  imports: [CommonModule, FormsModule],
})
export class TyperComponent {
  message: string = '';
  @Output() sendMessage = new EventEmitter<string>();

  onSend() {
    if (this.message.trim()) {
      this.sendMessage.emit(this.message);
      this.message = ''; // Clear the input after sending
    }
  }
}

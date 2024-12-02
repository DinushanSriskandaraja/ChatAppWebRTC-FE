// src/app/directive/message.directive.ts
import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[appMessage]',
})
export class MessageDirective implements OnInit {
  @Input() isSentByUser: boolean = false;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.el.nativeElement.style.textAlign = this.isSentByUser
      ? 'right'
      : 'left';
  }
}

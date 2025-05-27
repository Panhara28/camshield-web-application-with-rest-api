import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-angular-select',
  imports: [CommonModule, FormsModule],
  templateUrl: './angular-select.component.html',
  styleUrl: './angular-select.component.css',
})
export class AngularSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() disabled = false;
  @Input() loading = false;
  @Input() placeholder = 'Select...';
  @Input() clearable = true;

  @Output() selectionChange = new EventEmitter<string | null>();

  selected: SelectOption | null = null;
  searchTerm: string = '';

  get filteredOptions(): SelectOption[] {
    return this.options.filter((o) =>
      o.label.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  selectOption(option: SelectOption) {
    if (this.disabled || this.loading) return;
    this.selected = option;
    this.selectionChange.emit(option.value);
  }

  clearSelection() {
    this.selected = null;
    this.selectionChange.emit(null);
  }
}

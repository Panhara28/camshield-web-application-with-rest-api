import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-table',
  imports: [FormsModule, CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() pageSize = 5;
  @Input() displayFields: string[] = [];
  @Input() imageFields: string[] = [];
  @Input() headerLabels: { [key: string]: string } = {};

  tableTitle: string = '';
  searchTerm: string = '';
  currentPage: number = 1;
  filteredData: any[] = [];
  displayedData: any[] = [];
  headers: string[] = [];
  selectedRows: number[] = [];
  allSelected: boolean = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.initializeHeaders();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.initializeHeaders();
      this.filterData();
    }
  }

  initializeHeaders() {
    if (this.data.length > 0) {
      if (this.displayFields.length > 0) {
        this.headers = this.displayFields;
      } else {
        this.headers = Object.keys(this.data[0]);
      }
    }
  }

  getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  getHeaderLabel(key: string): string {
    return this.headerLabels[key] || key;
  }

  filterData() {
    this.filteredData = this.data.filter((item) =>
      Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(this.searchTerm.toLowerCase())
      )
    );
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  updateDisplayedData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedData = this.filteredData.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    this.currentPage = page;
    this.updateDisplayedData();
  }

  onEdit(id: number) {
    this.router.navigate([`/users/${id}/edit`]);
  }

  onView(id: number) {
    this.router.navigate([`/users/${id}`]);
  }

  onRemove(id: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      console.log('Remove user with ID:', id);
    }
  }

  toggleSelection(id: number) {
    const index = this.selectedRows.indexOf(id);
    if (index === -1) {
      this.selectedRows.push(id);
    } else {
      this.selectedRows.splice(index, 1);
    }
    this.allSelected = this.displayedData.every((row) =>
      this.selectedRows.includes(row.id)
    );
  }

  isSelected(id: number): boolean {
    return this.selectedRows.includes(id);
  }

  toggleAllSelection(event: any) {
    this.allSelected = event.target.checked;
    this.selectedRows = this.allSelected
      ? this.displayedData.map((row) => row.id)
      : [];
  }

  onBulkRemove() {
    if (
      confirm(
        `Are you sure you want to remove ${this.selectedRows.length} selected users?`
      )
    ) {
      console.log('Removing IDs:', this.selectedRows);
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.pageSize);
  }

  get pages(): number[] {
    return Array(this.totalPages)
      .fill(0)
      .map((_, i) => i + 1);
  }
}

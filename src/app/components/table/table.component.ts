import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-table',
  imports: [FormsModule, CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() pageSize = 5;
  @Input() displayFields: string[] = []; // Fields to display from the object
  @Input() imageFields: string[] = []; // Fields to render as <img>
  @Input() headerLabels: { [key: string]: string } = {}; // Custom header labels

  searchTerm: string = '';
  currentPage: number = 1;
  filteredData: any[] = [];
  displayedData: any[] = [];
  headers: string[] = [];

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

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.pageSize);
  }

  get pages(): number[] {
    return Array(this.totalPages)
      .fill(0)
      .map((_, i) => i + 1);
  }
}
